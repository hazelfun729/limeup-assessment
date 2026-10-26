import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { generateHandbook } from "../../src/lib/report/generator";
import { ReportBusyError } from "../../src/lib/report/pipeline";
import { claimReportJob, completeReportJob, failReportJob } from "../../src/lib/report/job";

export const config = { background: true };

export default async function handler(request: Request) {
  const secret = process.env.REPORT_JOB_SECRET;
  if (!secret) return new Response("Missing job secret", { status: 503 });
  const body = await request.text();
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = request.headers.get("X-Report-Signature") || "";
  const actual = /^[a-f0-9]{64}$/i.test(supplied) ? Buffer.from(supplied, "hex") : Buffer.alloc(0);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

  let assessmentId: string;
  let regenerate: boolean;
  let expectedVersion: number | null;
  let jobId: string;
  try {
    const payload = JSON.parse(body);
    if (typeof payload.assessmentId !== "string" || !payload.assessmentId || typeof payload.jobId !== "string" || !payload.jobId || typeof payload.regenerate !== "boolean" ||
      (payload.expectedVersion !== null && typeof payload.expectedVersion !== "number")) throw new Error();
    assessmentId = payload.assessmentId;
    jobId = payload.jobId;
    regenerate = payload.regenerate;
    expectedVersion = payload.expectedVersion;
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  if (!await claimReportJob(assessmentId, jobId)) return new Response("Already claimed or superseded", { status: 200 });
  try {
    const handbook = await prisma.growthHandbook.findUnique({ where: { assessmentId }, select: { status: true, contentHtml: true, version: true } });
    if (handbook?.status === "SENDING" || (!regenerate && handbook?.contentHtml) ||
      (regenerate && (handbook?.version ?? null) !== expectedVersion)) {
      try { await completeReportJob(assessmentId, jobId); }
      catch (saveError) { console.error("Skipped job completion record failed:", saveError); }
      return new Response("Already generated", { status: 200 });
    }
    await generateHandbook(assessmentId);
  } catch (error) {
    if (error instanceof ReportBusyError) {
      await failReportJob(assessmentId, jobId, error.message);
      return new Response("Already running", { status: 200 });
    }
    // The pipeline records failures for a visible manual retry. Retrying the function
    // automatically could repeat a paid AI call after an uncertain response.
    console.error("Background report generation failed:", error);
    try { await failReportJob(assessmentId, jobId, error instanceof Error ? error.message : "报告生成失败"); }
    catch (saveError) { console.error("Failed to record report job error:", saveError); }
    try {
      await prisma.growthHandbook.updateMany({ where: { assessmentId, contentHtml: null }, data: { status: "FAILED" } });
    } catch (saveError) {
      console.error("Failed to record report generation error:", saveError);
    }
  }
  try { await completeReportJob(assessmentId, jobId); }
  catch (saveError) { console.error("Report generated but job completion record failed:", saveError); }
  return new Response("Processed", { status: 200 });
}

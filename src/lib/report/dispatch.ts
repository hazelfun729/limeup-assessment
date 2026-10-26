import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { generateHandbook } from "./generator";
import { rejectReportJob, reserveReportJob } from "./job";

export class ReportDispatchUncertainError extends Error {}

/** Keep the payment action short on Netlify; local development runs the same generator directly. */
export async function dispatchReportGeneration(assessmentId: string, origin: string, regenerate = false) {
  const previous = await prisma.growthHandbook.findUnique({
    where: { assessmentId }, select: { id: true, version: true, contentHtml: true, status: true },
  });
  if (!regenerate && previous?.contentHtml) {
    return { outcome: "SKIPPED" as const, queued: false, handbookId: previous.id, status: previous.status };
  }
  if (previous?.status === "SENDING") throw new Error("报告邮件正在发送，请稍后再试");
  // SITE_ID is available in Netlify Functions at runtime; NETLIFY is build-only.
  if (!process.env.SITE_ID) {
    const result = await generateHandbook(assessmentId);
    return { outcome: "GENERATED" as const, queued: false, handbookId: result.handbookId, status: "REVIEWING" as const };
  }

  const secret = process.env.REPORT_JOB_SECRET;
  if (!secret) throw new Error("REPORT_JOB_SECRET 未配置，付款已确认但报告未排队");
  const current = new URL(origin);
  const primaryHost = new URL(process.env.URL || "https://invalid.local").hostname;
  const previewHost = process.env.SITE_NAME ? `--${process.env.SITE_NAME}.netlify.app` : "";
  if (current.protocol !== "https:" || (current.hostname !== primaryHost && (!previewHost || !current.hostname.endsWith(previewHost)))) {
    throw new Error("站点地址无法确认，报告未排队");
  }
  const job = await reserveReportJob(assessmentId, regenerate, regenerate ? previous?.version ?? null : null);
  if (!job) return { outcome: "ALREADY_QUEUED" as const, queued: true, handbookId: previous?.id ?? null, status: "ANALYZING" as const };
  const body = JSON.stringify({ assessmentId, regenerate, expectedVersion: job.expectedVersion, jobId: job.id });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  let response: Response;
  try {
    response = await fetch(new URL("/.netlify/functions/generate-report", current), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", "X-Report-Signature": signature },
      body,
    });
  } catch {
    // A network error can occur after Netlify accepted the request. Keep the
    // recorded job so an administrator can inspect it before a paid retry.
    throw new ReportDispatchUncertainError("报告排队结果不确定，请先检查任务状态，勿重复生成");
  }
  if (response.status !== 202) {
    await rejectReportJob(assessmentId, job.id, `HTTP ${response.status}`);
    throw new Error(`报告排队失败（HTTP ${response.status}），付款已确认，请在报告管理中重试`);
  }
  return { outcome: "QUEUED" as const, queued: true, handbookId: previous?.id ?? null, status: "ANALYZING" as const };
}

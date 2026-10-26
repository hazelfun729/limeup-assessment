// Read/write integration check for the real Supabase pooler. It owns and removes
// one temporary SiteConfig row; it never calls the model or sends email.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { claimReportJob, completeReportJob, getReportJob, reserveReportJob } from "../src/lib/report/job";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const assessmentId = `job_live_${randomBytes(10).toString("hex")}`;
try {
  const reservations = await Promise.all([
    reserveReportJob(assessmentId, false, null),
    reserveReportJob(assessmentId, false, null),
  ]);
  assert.equal(reservations.filter(Boolean).length, 1, "concurrent dispatch must reserve one job");
  const job = reservations.find(Boolean)!;
  assert.equal((await getReportJob(assessmentId))?.id, job.id);
  assert.equal(await claimReportJob(assessmentId, job.id), true);
  assert.equal(await claimReportJob(assessmentId, job.id), false);
  assert.equal(await completeReportJob(assessmentId, job.id), true);
  assert.equal((await getReportJob(assessmentId))?.state, "SUCCEEDED");
  console.log("PASS Supabase report job reservation, claim and completion");
} finally {
  await prisma.siteConfig.deleteMany({ where: { key: `report:job:${assessmentId}` } });
  await prisma.$disconnect();
}

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Netlify background functions can run for at most 15 minutes. A longer lease
// makes an accepted-but-lost request visible without retrying a paid AI call.
export const REPORT_JOB_STALE_MS = 20 * 60_000;

export type ReportJob = {
  id: string;
  assessmentId: string;
  state: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  requestedAt: string;
  regenerate: boolean;
  expectedVersion: number | null;
  error?: string;
};

const jobKey = (assessmentId: string) => `report:job:${assessmentId}`;

export function parseReportJob(value: string): ReportJob {
  const job = JSON.parse(value) as ReportJob;
  if (!job?.id || !job.requestedAt || !Number.isFinite(new Date(job.requestedAt).getTime()) || !job.state) {
    throw new Error("报告任务记录无效，请人工核查");
  }
  return job;
}

export function isStaleReportJob(job: ReportJob, now = Date.now()) {
  return (job.state === "QUEUED" || job.state === "RUNNING") &&
    now - new Date(job.requestedAt).getTime() > REPORT_JOB_STALE_MS;
}

export async function getReportJob(assessmentId: string) {
  const row = await prisma.siteConfig.findUnique({ where: { key: jobKey(assessmentId) } });
  return row ? parseReportJob(row.value) : null;
}

export async function reserveReportJob(assessmentId: string, regenerate: boolean, expectedVersion: number | null) {
  const key = jobKey(assessmentId);
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${key})) AS acquired`;
    if (!lock?.acquired) return null;
    const previous = await tx.siteConfig.findUnique({ where: { key } });
    if (previous) {
      const job = parseReportJob(previous.value);
      if ((job.state === "QUEUED" || job.state === "RUNNING") && !isStaleReportJob(job)) return null;
    }
    const job: ReportJob = {
      id: randomUUID(), assessmentId, state: "QUEUED", requestedAt: new Date().toISOString(), regenerate, expectedVersion,
    };
    await tx.siteConfig.upsert({
      where: { key }, create: { key, value: JSON.stringify(job) }, update: { value: JSON.stringify(job) },
    });
    return job;
  }, { maxWait: 10000, timeout: 30000 });
}

async function transitionReportJob(assessmentId: string, id: string, from: ReportJob["state"], to: ReportJob["state"], error?: string) {
  const key = jobKey(assessmentId);
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  if (!row) return false;
  const current = parseReportJob(row.value);
  if (current.id !== id || current.state !== from) return false;
  const next: ReportJob = { ...current, state: to, ...(error ? { error } : {}) };
  const changed = await prisma.siteConfig.updateMany({
    where: { key, value: row.value }, data: { value: JSON.stringify(next) },
  });
  return changed.count === 1;
}

export const claimReportJob = (assessmentId: string, id: string) =>
  transitionReportJob(assessmentId, id, "QUEUED", "RUNNING");
export const completeReportJob = (assessmentId: string, id: string) =>
  transitionReportJob(assessmentId, id, "RUNNING", "SUCCEEDED");
export const failReportJob = (assessmentId: string, id: string, error: string) =>
  transitionReportJob(assessmentId, id, "RUNNING", "FAILED", error);
export const rejectReportJob = (assessmentId: string, id: string, error: string) =>
  transitionReportJob(assessmentId, id, "QUEUED", "FAILED", error);

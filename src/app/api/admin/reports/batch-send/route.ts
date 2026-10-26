import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { sendReviewedReport } from "@/lib/report/send";

/** Batch review/send uses the same idempotent delivery path as the detail page. */
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids = body?.handbookIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "请选择 1 至 50 份报告" }, { status: 400 });
  }
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of new Set(ids as string[])) {
    try {
      const delivery = await sendReviewedReport(id, admin.id);
      results.push({ id, success: delivery.status === "SENT", error: delivery.status === "SENT" ? undefined : delivery.error || "邮件结果待核实" });
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : "发送失败" });
    }
  }
  const sent = results.filter((result) => result.success).length;
  await prisma.operationLog.create({
    data: { adminId: admin.id, adminName: admin.username, action: "batch_send_reports", target: JSON.stringify(ids), details: `确认投递 ${sent}/${results.length} 份` },
  });
  return NextResponse.json({ success: true, total: results.length, sent, failed: results.length - sent, results });
}

import { confirmAndStartReport, ReportDispatchError } from "@/lib/payments/confirm";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";

/**
 * POST /api/admin/payments/batch-confirm
 * Batch confirm pending payments
 * Body: { paymentIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { paymentIds } = await request.json();
    if (!Array.isArray(paymentIds) || paymentIds.length === 0 || paymentIds.length > 10 || !paymentIds.every((id) => typeof id === "string") || new Set(paymentIds).size !== paymentIds.length) {
      return NextResponse.json({ error: "一次请选择 1–10 笔支付记录" }, { status: 400 });
    }

    const results: Array<{ id: string; success: boolean; paymentConfirmed?: boolean; error?: string; reportStatus?: string; warning?: string }> = [];

    for (const pid of paymentIds) {
      try {
        const { reportStatus, warning } = await confirmAndStartReport(pid, adminId, request.url);

        results.push({ id: pid, success: true, reportStatus, warning });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: pid, success: false, paymentConfirmed: err instanceof ReportDispatchError, error: msg });
      }
    }

    const confirmedCount = results.filter((r) => r.success || r.paymentConfirmed).length;

    return NextResponse.json({
      success: true,
      total: paymentIds.length,
      confirmed: confirmedCount,
      failed: paymentIds.length - confirmedCount,
      generationFailed: results.filter((r) => r.paymentConfirmed).length,
      generationUncertain: results.filter((r) => r.warning).length,
      results,
    });
  } catch (error) {
    console.error("Batch confirm error:", error);
    return NextResponse.json({ error: "批量确认失败" }, { status: 500 });
  }
}

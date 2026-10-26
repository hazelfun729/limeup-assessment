import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { confirmAndStartReport, ReportDispatchError } from "@/lib/payments/confirm";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const transactionId = typeof body.wechatTransactionId === "string" ? body.wechatTransactionId.trim() : undefined;
    const allowSuffixMismatch = body.allowSuffixMismatch === true;
    const { handbook, reportStatus, queued, warning } = await confirmAndStartReport(id, admin.id, request.url, transactionId, allowSuffixMismatch);
    return NextResponse.json({ success: true, reportStatus, handbookId: handbook.id, queued, warning });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "该微信支付订单号已经用于另一笔付款，请人工核对" }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "确认失败" }, { status: error instanceof ReportDispatchError ? 502 : 400 });
  }
}

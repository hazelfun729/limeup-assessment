import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { confirmAndStartReport, ReportDispatchError } from "@/lib/payments/confirm";
import { matchWeChatBill, parsePersonalWeChatWorkbook, parseWeChatBill } from "@/lib/payments/wechat-bill";

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.(csv|txt|xlsx)$/i.test(file.name) || file.size > 2_000_000) {
      return NextResponse.json({ error: "请选择不超过 2 MB 的微信账单 Excel 或 CSV 文件" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    let transactions;
    if (/\.xlsx$/i.test(file.name)) {
      const receiverNickname = process.env.WECHAT_RECEIVER_NICKNAME;
      if (!receiverNickname) throw new Error("收款账户尚未绑定，需先提供收款码所属微信账户导出的账单样例");
      transactions = await parsePersonalWeChatWorkbook(bytes, receiverNickname);
    } else {
      const merchantId = process.env.WECHAT_MERCHANT_ID;
      if (!merchantId) throw new Error("微信商户号尚未绑定，无法自动核对 CSV 商户账单");
      let content: string;
      try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { content = new TextDecoder("gb18030").decode(bytes); }
      transactions = parseWeChatBill(content, merchantId);
    }
    if (!transactions.length) return NextResponse.json({ error: "账单中没有可识别的交易记录，请核对文件格式" }, { status: 400 });
    const earliest = Math.min(...transactions.map((row) => row.paidAt.getTime()));
    const latest = Math.max(...transactions.map((row) => row.paidAt.getTime()));
    const [pending, used] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: "PENDING", method: "WECHAT_PAY",
          createdAt: { gte: new Date(earliest - 86400000), lte: new Date(latest + 14 * 86400000) },
        },
        select: { id: true, remark: true, amount: true, createdAt: true },
        take: 5001,
      }),
      prisma.payment.findMany({ where: { wechatTransactionId: { not: null } }, select: { wechatTransactionId: true } }),
    ]);
    if (pending.length > 5000) throw new Error("待核对订单过多，请联系管理员分批处理");
    const result = matchWeChatBill(
      pending.map((payment) => ({
        id: payment.id,
        suffix: payment.remark,
        amountCents: Math.round(Number(payment.amount) * 100),
        createdAt: payment.createdAt,
      })),
      transactions,
      new Set(used.map((payment) => payment.wechatTransactionId).filter((id): id is string => Boolean(id))),
    );
    if (result.matches.length > 10) {
      return NextResponse.json({ error: "本次匹配超过 10 笔，请分批上传较短日期范围的账单" }, { status: 400 });
    }
    const confirmed: string[] = [];
    const failed: Array<{ paymentId: string; reason: string }> = [];
    for (const match of result.matches) {
      try {
        await confirmAndStartReport(match.paymentId, admin.id, request.url, match.transactionId);
        confirmed.push(match.paymentId);
      } catch (error) {
        if (error instanceof ReportDispatchError) confirmed.push(match.paymentId);
        failed.push({ paymentId: match.paymentId, reason: error instanceof Error ? error.message : "确认失败" });
      }
    }
    return NextResponse.json({
      billTransactions: transactions.length,
      confirmed: confirmed.length,
      conflicts: result.conflicts.length,
      unmatched: result.unmatched.length,
      conflictPaymentIds: result.conflicts,
      unmatchedPaymentIds: result.unmatched,
      failed,
    });
  } catch (error) {
    console.error("WeChat bill reconciliation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "账单核对失败" }, { status: 400 });
  }
}

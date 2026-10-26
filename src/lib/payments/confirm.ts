import { prisma } from "@/lib/prisma";
import { dispatchReportGeneration, ReportDispatchUncertainError } from "@/lib/report/dispatch";

export class ReportDispatchError extends Error {}

export async function confirmPayment(id: string, adminId: string, wechatTransactionId?: string, allowSuffixMismatch = false) {
  return prisma.$transaction(async tx => {
    const pending = await tx.payment.findUnique({ where: { id } });
    if (!pending) throw new Error("支付记录不存在");
    if (wechatTransactionId) {
      if (!/^[A-Za-z0-9]{10,64}$/.test(wechatTransactionId)) throw new Error("微信支付订单号格式不正确");
      if (pending.remark && !wechatTransactionId.endsWith(pending.remark) && !allowSuffixMismatch) {
        throw new Error("完整订单号与家长填写的后六位不一致，请核对后再确认");
      }
    }
    const changed = await tx.payment.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        confirmedBy: adminId,
        confirmedAt: new Date(),
        ...(wechatTransactionId ? { wechatTransactionId } : {}),
      },
    });
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment) throw new Error("支付记录不存在");
    if (payment.status !== "CONFIRMED") throw new Error("该订单无法确认");
    const handbook = await tx.growthHandbook.upsert({ where: { assessmentId: payment.assessmentId }, create: { userId: payment.userId, assessmentId: payment.assessmentId, status: "ANALYZING" }, update: {} });
    if (changed.count) {
      const admin = await tx.admin.findUnique({ where: { id: adminId } });
      await tx.operationLog.create({ data: { adminId, adminName: admin?.username, action: "confirm_payment", target: id, details: `确认订单付款${wechatTransactionId ? `，微信支付订单号：${wechatTransactionId}` : ""}${allowSuffixMismatch ? "，已人工核实尾号差异" : ""}` } });
    }
    return { payment, handbook, changed: !!changed.count };
  }, { maxWait: 10000, timeout: 30000 });
}

export async function confirmAndStartReport(id: string, adminId: string, origin: string, wechatTransactionId?: string, allowSuffixMismatch = false) {
  const { payment, handbook, changed } = await confirmPayment(id, adminId, wechatTransactionId, allowSuffixMismatch);
  if (handbook.contentHtml || (!changed && handbook.status !== "FAILED")) {
    return { payment, handbook, reportStatus: handbook.status, queued: false };
  }
  try {
    const started = await dispatchReportGeneration(payment.assessmentId, origin);
    return { payment, handbook, reportStatus: started.queued ? "ANALYZING" : "REVIEWING", queued: started.queued };
  } catch (error) {
    if (error instanceof ReportDispatchUncertainError) {
      if (handbook.status === "FAILED") {
        await prisma.growthHandbook.updateMany({
          where: { id: handbook.id, status: "FAILED", contentHtml: null },
          data: { status: "ANALYZING" },
        });
      }
      return { payment, handbook, reportStatus: "ANALYZING", queued: true, warning: error.message };
    }
    try {
      await prisma.growthHandbook.updateMany({
        where: { assessmentId: payment.assessmentId, contentHtml: null },
        data: { status: "FAILED" },
      });
    } catch (saveError) {
      console.error("Failed to record report dispatch error:", saveError);
    }
    throw new ReportDispatchError(`付款已确认，但报告启动失败：${error instanceof Error ? error.message : "请在报告管理中重试"}`);
  }
}

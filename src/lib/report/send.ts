import { prisma } from "@/lib/prisma";
import { deliver } from "@/lib/mail/delivery";
import { renderReportEmail } from "@/lib/report/document";

export class ReportSendError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function reportDeliveryId(handbookId: string, version: number) {
  return `report-${handbookId}-v${version}`;
}

export function isDeliverableReportAddress(address: string) {
  const email = address.trim();
  const domain = email.split("@")[1]?.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && !!domain
    && ![".local", ".localhost", ".invalid", ".test", ".example"].some((suffix) => domain.endsWith(suffix));
}

/** One delivery per report version. The mail provider's acceptance is the source of truth. */
export async function sendReviewedReport(id: string, adminId: string) {
  const handbook = await prisma.growthHandbook.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, emailVerified: true } },
      assessment: { include: { growthProfile: true, payment: true } },
    },
  });
  if (!handbook) throw new ReportSendError("报告不存在", 404);
  if (!["REVIEWING", "SENDING", "SENT"].includes(handbook.status)) {
    throw new ReportSendError("请先生成并审核报告");
  }
  if (!handbook.contentHtml?.trim()) throw new ReportSendError("报告正文为空，无法发送");
  if (!isDeliverableReportAddress(handbook.user.email)) {
    throw new ReportSendError("该记录使用占位或无效邮箱，无法真实送达。请用已验证的真实用户记录测试。");
  }
  if (handbook.assessment.payment?.status !== "CONFIRMED") {
    throw new ReportSendError("付款尚未确认，不能发送付费报告");
  }
  if (!handbook.user.emailVerified) throw new ReportSendError("用户邮箱尚未验证，不能发送报告");

  const deliveryId = reportDeliveryId(handbook.id, handbook.version);
  const emailId = `report-email-${handbook.id}-v${handbook.version}`;
  const subject = `${handbook.assessment.studentName || "孩子"}的成长导航报告｜青柠伴学`;
  let delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) {
    if (handbook.status === "SENT") {
      throw new ReportSendError("此前标记为已发送，但没有可核实的投递记录；请先人工核对邮件服务记录。", 409);
    }
    const html = await renderReportEmail(handbook);
    try {
      delivery = await prisma.delivery.create({
        data: { id: deliveryId, kind: "HANDBOOK", userId: handbook.userId, to: handbook.user.email, subject, html },
      });
    } catch (error) {
      // A concurrent request may have created the same immutable delivery.
      delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
      if (!delivery) throw error;
    }
  }
  if (delivery.to !== handbook.user.email) {
    throw new ReportSendError("报告版本的收件地址已变更，请人工核实原发送记录。", 409);
  }

  if (handbook.status === "REVIEWING") {
    await prisma.growthHandbook.updateMany({
      where: { id, status: "REVIEWING", version: handbook.version },
      data: { status: "SENDING", reviewedAt: new Date(), reviewedBy: adminId },
    });
  }
  const current = await prisma.growthHandbook.findUniqueOrThrow({ where: { id }, select: { version: true, status: true } });
  if (current.version !== handbook.version || !["SENDING", "SENT"].includes(current.status)) {
    throw new ReportSendError("报告版本已变化，请刷新后重新审核", 409);
  }
  if (delivery.status === "PENDING" || delivery.status === "FAILED") {
    delivery = await deliver(deliveryId);
  }
  if (delivery.status === "SENT") {
    await prisma.growthHandbook.update({
      where: { id },
      data: { status: "SENT", sentAt: delivery.sentAt, sentTo: delivery.to },
    });
  }
  await prisma.email.upsert({
    where: { id: emailId },
    create: {
      id: emailId, userId: handbook.userId, type: "HANDBOOK", to: delivery.to,
      subject: delivery.subject, status: delivery.status === "SENT" ? "SENT" : delivery.status === "FAILED" ? "FAILED" : "PENDING",
      sentAt: delivery.sentAt, failedReason: delivery.error,
    },
    update: {
      status: delivery.status === "SENT" ? "SENT" : delivery.status === "FAILED" ? "FAILED" : "PENDING",
      sentAt: delivery.sentAt, failedReason: delivery.error, retryCount: Math.max(0, delivery.attempts - 1),
    },
  });
  return {
    id: handbook.id, to: delivery.to, status: delivery.status,
    sentAt: delivery.sentAt, error: delivery.error,
  };
}

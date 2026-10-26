import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { sendMailMessage, smtpTransport } from "./transport";

const REPORT_LOGO_CID = "limeup-report-logo";

async function reportInlineLogo(html: string) {
  if (!html.includes(`cid:${REPORT_LOGO_CID}`)) return null;
  return readFile(join(process.cwd(), "public/logo-banner.png"));
}

export function mailErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const responseCode = (error as { responseCode?: number })?.responseCode;
  if (code === "EAUTH" || responseCode === 535 || responseCode === 534) {
    return "邮箱认证失败，请检查 SMTP_USER 和 SMTP_PASS（QQ 邮箱需使用 SMTP 授权码）并重启服务";
  }
  if (code === "ECONNECTION" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return "无法连接邮件服务器，请检查 SMTP_HOST、SMTP_PORT 和网络";
  }
  if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNRESET") {
    return "邮件服务连接中断或超时，请先核对邮箱及服务商发送记录";
  }
  if (code === "EENVELOPE" || responseCode === 550 || responseCode === 553) {
    return "邮件服务器拒绝收件地址，请核对用户邮箱";
  }
  return "邮件服务拒绝发送，请检查发件配置及服务商记录";
}

/** Checks SMTP authentication without sending a message. */
export async function verifyMailService() {
  if (!process.env.SMTP_HOST) {
    return { ok: false, message: process.env.RESEND_API_KEY ? "已配置 Resend；请通过实际发送确认投递" : "邮件服务尚未配置" };
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, message: "缺少 SMTP_USER 或 SMTP_PASS" };
  }
  try {
    await smtpTransport().verify();
    return { ok: true, message: "邮件服务器连接和身份认证正常；收件成功仍需实际发送后确认" };
  } catch (error) {
    return { ok: false, message: mailErrorMessage(error) };
  }
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function publicSiteUrl(): string | null {
  try {
    const u = new URL(process.env.PUBLIC_SITE_URL || "");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.hostname === "localhost" ||
      u.hostname.endsWith(".local") ||
      u.hostname.endsWith(".localhost") ||
      /^[\d.]+$/.test(u.hostname) ||
      u.hostname.includes(":")
    )
      return null;
    return u.origin;
  } catch {
    return null;
  }
}
export async function deliver(id: string) {
  const claimed = await prisma.delivery.updateMany({
    where: { id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "SENDING", error: null, attempts: { increment: 1 } },
  });
  if (!claimed.count)
    return prisma.delivery.findUniqueOrThrow({ where: { id } });
  const mail = await prisma.delivery.findUniqueOrThrow({ where: { id } });
  try {
    const inlineLogo = mail.kind === "HANDBOOK" ? await reportInlineLogo(mail.html) : null;
    await sendMailMessage({
      id: mail.id, to: mail.to, subject: mail.subject, html: mail.html,
      inlineLogo: inlineLogo ? { filename: "limeup-logo.png", content: inlineLogo, cid: REPORT_LOGO_CID, contentType: "image/png" } : undefined,
    });
  } catch (error) {
    // Network failures can occur after acceptance; don't automatically resend an uncertain delivery.
    const code = (error as { code?: string }).code;
    const uncertain =
      code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNRESET";
    return prisma.delivery.update({
      where: { id },
      data: {
        status: uncertain ? "UNKNOWN" : "FAILED",
        error: uncertain
          ? "发送结果待核实，请先检查邮箱或服务商记录"
          : mailErrorMessage(error),
      },
    });
  }
  // Keep SENDING if the DB write fails after SMTP accepted; never treat it as a safe retry.
  return prisma.delivery.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });
}

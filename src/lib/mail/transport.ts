import nodemailer from "nodemailer";
import { Resend } from "resend";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);
}

export function smtpTransport() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    socketTimeout: 30000,
  });
}

type InlineLogo = { filename: string; content: Buffer; cid: string; contentType: string };

export async function sendMailMessage(message: { to: string; subject: string; html: string; id?: string; inlineLogo?: InlineLogo }) {
  if (process.env.SMTP_HOST) {
    const result = await smtpTransport().sendMail({
      from: `"青柠伴学" <${process.env.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.inlineLogo ? [message.inlineLogo] : [],
      ...(message.id ? { messageId: `<${message.id}@${process.env.SMTP_USER?.split("@")[1] || "limeup-happystudy.com"}>` } : {}),
    });
    if (!result.accepted.length) throw new Error("邮件服务器未接受收件地址");
    return;
  }
  if (process.env.RESEND_API_KEY) {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: process.env.MAIL_FROM || "青柠伴学 <noreply@limeup-happystudy.com>",
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.inlineLogo ? [{ filename: message.inlineLogo.filename, content: message.inlineLogo.content, contentId: message.inlineLogo.cid, contentType: message.inlineLogo.contentType }] : [],
      },
      message.id ? { idempotencyKey: message.id } : undefined,
    );
    if (result.error) throw new Error("邮件服务拒绝发送");
    return;
  }
  throw new Error("邮件服务尚未配置");
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// Email providers (same priority as send-code)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM_NAME = "青柠伴学";
const FROM_ADDR = process.env.SMTP_USER || "noreply@limeup-happystudy.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://limeup-happystudy.com";

function handbookEmailHtml(studentName: string, reportUrl: string) {
  return `
    <div style="font-family: 'PingFang SC', 'HarmonyOS Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #f0f7d4; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; font-size: 28px;">🌱</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center; margin-bottom: 8px;">
        ${studentName}的成长导航手册已生成
      </h2>
      <p style="font-size: 15px; color: #666; line-height: 1.8; text-align: center; margin-bottom: 32px;">
        基于测评结果，我们为${studentName}生成了一份专属的成长导航手册。<br/>
        包含学习类型分析、九大维度评估和个性化成长建议。
      </p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${reportUrl}" style="display: inline-block; background: #6a9b1e; color: #fff; font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 12px; text-decoration: none;">
          查看成长导航手册
        </a>
      </div>
      <p style="font-size: 13px; color: #999; line-height: 1.6; text-align: center;">
        如按钮无法点击，请复制以下链接到浏览器：<br/>
        <span style="color: #666; word-break: break-all;">${reportUrl}</span>
      </p>
      <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 20px; text-align: center;">
        <p style="font-size: 12px; color: #bbb;">
          LIMEUP 青柠伴学 · Every Child Deserves a Growth OS
        </p>
      </div>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (smtpTransport) {
    try {
      await smtpTransport.sendMail({ from: `"${FROM_NAME}" <${FROM_ADDR}>`, to, subject, html });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  } else if (resend) {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <noreply@limeup-happystudy.com>`,
      to, subject, html,
    });
    return error ? { success: false, error: error.message } : { success: true };
  } else {
    // Dev mode — log to console
    console.log(`[DEV] Handbook email to ${to}: ${subject}`);
    return { success: true };
  }
}

/**
 * POST /api/admin/reports/batch-send
 * Batch send handbook notification emails
 * Body: { handbookIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { handbookIds } = await request.json();
    if (!Array.isArray(handbookIds) || handbookIds.length === 0) {
      return NextResponse.json({ error: "请选择至少一份报告" }, { status: 400 });
    }

    // Fetch handbooks with user + assessment info
    const handbooks = await prisma.growthHandbook.findMany({
      where: { id: { in: handbookIds }, status: "SENDING" },
      include: {
        user: { select: { id: true, email: true } },
        assessment: { select: { id: true, studentName: true } },
      },
    });

    if (handbooks.length === 0) {
      return NextResponse.json({ error: "没有可发送的报告（仅 SENDING 状态可发送）" }, { status: 400 });
    }

    const results: Array<{ id: string; email: string; success: boolean; error?: string }> = [];

    for (const hb of handbooks) {
      const studentName = hb.assessment.studentName || "学生";
      const reportUrl = `${SITE_URL}/report/${hb.id}`;
      const subject = `${studentName}的成长导航手册 — 青柠伴学`;
      const html = handbookEmailHtml(studentName, reportUrl);

      const result = await sendEmail(hb.user.email, subject, html);

      // Record in email table
      await prisma.email.create({
        data: {
          userId: hb.user.id,
          type: "HANDBOOK",
          to: hb.user.email,
          subject,
          status: result.success ? "SENT" : "FAILED",
          sentAt: result.success ? new Date() : null,
          failedReason: result.error || null,
        },
      });

      // Update handbook status to SENT if email sent successfully
      if (result.success) {
        await prisma.growthHandbook.update({
          where: { id: hb.id },
          data: { status: "SENT", sentAt: new Date(), sentTo: hb.user.email },
        });
      }

      results.push({ id: hb.id, email: hb.user.email, success: result.success, error: result.error });
    }

    // Log operation
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    const sentCount = results.filter((r) => r.success).length;
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "batch_send_reports",
        target: JSON.stringify(handbookIds),
        details: `发送 ${sentCount}/${results.length} 份报告`,
      },
    });

    return NextResponse.json({
      success: true,
      total: results.length,
      sent: sentCount,
      failed: results.length - sentCount,
      results,
    });
  } catch (error) {
    console.error("Batch send error:", error);
    return NextResponse.json({ error: "批量发送失败" }, { status: 500 });
  }
}

import { randomInt } from "node:crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { assessmentAccess } from "@/lib/security/assessment";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailConfigured, sendMailMessage } from "@/lib/mail/transport";
import { mailErrorMessage } from "@/lib/mail/delivery";

function verificationHtml(code: string) {
  return `
    <div style="font-family: 'PingFang SC', 'HarmonyOS Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
        邮箱验证码
      </h2>
      <p style="font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 24px;">
        您正在进行自主学习力测评，验证码为：
      </p>
      <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">
          ${code}
        </span>
      </div>
      <p style="font-size: 13px; color: #999; line-height: 1.6;">
        验证码 5 分钟内有效，请勿泄露给他人。<br/>
        如非本人操作，请忽略此邮件。
      </p>
      <p style="font-size: 13px; color: #999; margin-top: 32px;">
        — LIMEUP 青柠伴学
      </p>
    </div>
  `;
}

/**
 * POST /api/auth/send-code
 * Send email verification code
 * Body: { email: string, assessmentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const assessmentId = body.assessmentId;

    if (!email) {
      return NextResponse.json({ error: "邮箱为必填项" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    if (!mailConfigured()) return NextResponse.json({ error: "邮件服务尚未配置，请联系客服" }, { status: 503 });
    const limited = await rateLimit("send-code", email, 1, 60);
    if (limited) return limited;

    // Verify assessment exists if ID provided
    if (assessmentId) {
      if (typeof assessmentId !== "string") return NextResponse.json({ error: "测评ID不正确" }, { status: 400 });
      const denied = await assessmentAccess(assessmentId);
      if (denied) return denied;
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });
      if (!assessment) {
        return NextResponse.json({ error: "测评不存在" }, { status: 404 });
      }
    }

    // Generate 6-digit code, valid for 5 minutes
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const subject = "青柠伴学 - 邮箱验证码";

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationCode: code, codeExpiresAt: expiresAt },
      });
    } else {
      user = await prisma.user.create({
        data: { email, verificationCode: code, codeExpiresAt: expiresAt },
      });
    }

    try {
      await sendMailMessage({ to: email, subject, html: verificationHtml(code) });
    } catch (err) {
      await prisma.email.create({ data: { userId: user.id, type: "VERIFICATION", to: email, subject, status: "FAILED", failedReason: mailErrorMessage(err) } });
      return NextResponse.json({ error: "验证码邮件发送失败，请稍后重试或联系客服" }, { status: 500 });
    }
    await prisma.email.create({ data: { userId: user.id, type: "VERIFICATION", to: email, subject, status: "SENT", sentAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send verification code:", error);
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

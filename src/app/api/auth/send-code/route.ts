import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// Email provider priority: SMTP (阿里云) > Resend > Dev Mode
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const FROM_NAME = "青柠伴学";
const FROM_ADDR = process.env.SMTP_USER || "noreply@limeup-happystudy.com";

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
    const { email, assessmentId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "邮箱为必填项" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // Verify assessment exists if ID provided
    if (assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });
      if (!assessment) {
        return NextResponse.json({ error: "测评不存在" }, { status: 404 });
      }
    }

    // Generate 6-digit code, valid for 5 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
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

    // ── Send email ──

    if (smtpTransport) {
      // Priority 1: SMTP (阿里云邮件推送)
      try {
        await smtpTransport.sendMail({
          from: `"${FROM_NAME}" <${FROM_ADDR}>`,
          to: email,
          subject,
          html: verificationHtml(code),
        });
        await prisma.email.create({
          data: {
            userId: user.id,
            type: "VERIFICATION",
            to: email,
            subject,
            status: "SENT",
            sentAt: new Date(),
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("SMTP send error:", message);
        await prisma.email.create({
          data: {
            userId: user.id,
            type: "VERIFICATION",
            to: email,
            subject,
            status: "FAILED",
            failedReason: message,
          },
        });
      }
    } else if (resend) {
      // Priority 2: Resend
      const { error: sendError } = await resend.emails.send({
        from: `${FROM_NAME} <noreply@limeup-happystudy.com>`,
        to: email,
        subject,
        html: verificationHtml(code),
      });
      if (sendError) {
        console.error("Resend send error:", sendError);
        await prisma.email.create({
          data: {
            userId: user.id,
            type: "VERIFICATION",
            to: email,
            subject,
            status: "FAILED",
            failedReason: sendError.message,
          },
        });
      } else {
        await prisma.email.create({
          data: {
            userId: user.id,
            type: "VERIFICATION",
            to: email,
            subject,
            status: "SENT",
            sentAt: new Date(),
          },
        });
      }
    } else {
      // Priority 3: Dev Mode — code logged + stored in DB
      console.log(`[DEV] Verification code for ${email}: ${code}`);
      await prisma.email.create({
        data: {
          userId: user.id,
          type: "VERIFICATION",
          to: email,
          subject,
          status: "SENT",
          sentAt: new Date(),
          body: `[DEV MODE] Code: ${code}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send verification code:", error);
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

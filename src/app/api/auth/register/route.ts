import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, getSessionMaxAge } from "@/lib/user/auth";

/**
 * POST /api/auth/register
 * Register via email + verification code (with optional password)
 * Body: { email, code, password?, assessmentId? }
 * If user doesn't exist: create user, verify code, set session
 * If user exists: verify code, update password if provided, set session
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, password, assessmentId } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "邮箱和验证码为必填项" },
        { status: 400 }
      );
    }

    // Find or check user existence
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在，请先发送验证码" },
        { status: 404 }
      );
    }

    // Verify code
    if (!user.verificationCode || !user.codeExpiresAt) {
      return NextResponse.json(
        { error: "请先发送验证码" },
        { status: 400 }
      );
    }

    if (user.codeExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "验证码已过期，请重新发送" },
        { status: 400 }
      );
    }

    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: "验证码不正确" },
        { status: 400 }
      );
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (password) {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user: verify email, clear code, set password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    // Link assessment if provided
    if (assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });
      if (assessment) {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            userId: user.id,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }
    }

    // Auto-create CRM contact
    const existingCrm = await prisma.cRMContact.findUnique({
      where: { userId: user.id },
    });
    if (!existingCrm) {
      await prisma.cRMContact.create({
        data: {
          userId: user.id,
          tags: ["测评用户"],
          source: "测评网站",
        },
      });
    }

    // Set session cookie
    const cookieName = getSessionCookieName();
    const maxAge = getSessionMaxAge();

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
    });

    response.cookies.set(cookieName, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

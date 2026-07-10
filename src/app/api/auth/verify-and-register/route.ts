import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, getSessionMaxAge } from "@/lib/user/auth";

/**
 * POST /api/auth/verify-and-register
 * Verify email code and link assessment to user
 * Body: { email: string, code: string, assessmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, assessmentId } = await request.json();

    if (!email || !code || !assessmentId) {
      return NextResponse.json(
        { error: "邮箱、验证码和测评ID为必填项" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

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

    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "测评不存在" },
        { status: 404 }
      );
    }

    // Mark email verified, clear verification code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    // Link assessment to user and mark as completed
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

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

    // Set user session cookie (auto-login after registration)
    const cookieName = getSessionCookieName();
    const maxAge = getSessionMaxAge();

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      assessmentId,
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
    console.error("Failed to verify and register:", error);
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}

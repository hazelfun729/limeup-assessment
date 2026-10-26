import { rateLimit } from "@/lib/security/rate-limit";
import { createSession } from "@/lib/security/session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, getSessionMaxAge } from "@/lib/user/auth";

/**
 * POST /api/auth/login
 * Login with email + verification code (for existing users)
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = body.code;

    if (!email || !code) {
      return NextResponse.json(
        { error: "邮箱和验证码为必填项" },
        { status: 400 }
      );
    }

    const limited = await rateLimit("verify", String(email), 10, 300);
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在，请先完成测评并注册" },
        { status: 404 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "邮箱未验证，请先完成测评注册流程" },
        { status: 403 }
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

    // Clear verification code
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, verificationCode: code, codeExpiresAt: { gt: new Date() } },
      data: {
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    if (!consumed.count) return NextResponse.json({ error: "验证码已使用，请重新获取" }, { status: 400 });

    // Set session cookie
    const cookieName = getSessionCookieName();
    const maxAge = getSessionMaxAge();

    const response = NextResponse.json({
      success: true,
      userId: user.id,
    });

    response.cookies.set(cookieName, await createSession("USER", user.id, maxAge), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}

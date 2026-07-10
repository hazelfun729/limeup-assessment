import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/verify-code
 * Standalone verification code check
 * Body: { email, code }
 * Returns: { valid: true/false }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "邮箱和验证码为必填项" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    if (!user.verificationCode || !user.codeExpiresAt) {
      return NextResponse.json(
        { valid: false, error: "请先发送验证码" },
        { status: 400 }
      );
    }

    if (user.codeExpiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "验证码已过期" },
        { status: 400 }
      );
    }

    if (user.verificationCode !== code) {
      return NextResponse.json(
        { valid: false, error: "验证码不正确" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "验证失败" },
      { status: 500 }
    );
  }
}

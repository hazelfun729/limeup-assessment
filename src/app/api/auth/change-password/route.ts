import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user/auth";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/change-password
 * Set or change user password
 * Body: { password: string, code: string }  (code = email verification code for identity confirmation)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { password, code } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要6位" },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "请先发送验证码确认身份" },
        { status: 400 }
      );
    }

    // Verify identity via email code
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (!fullUser.verificationCode || !fullUser.codeExpiresAt) {
      return NextResponse.json(
        { error: "请先发送验证码" },
        { status: 400 }
      );
    }

    if (fullUser.codeExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "验证码已过期，请重新发送" },
        { status: 400 }
      );
    }

    if (fullUser.verificationCode !== code) {
      return NextResponse.json(
        { error: "验证码不正确" },
        { status: 400 }
      );
    }

    // Hash and save password
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Change password failed:", error);
    return NextResponse.json(
      { error: "修改密码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

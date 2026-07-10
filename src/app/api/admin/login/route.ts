import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * POST /api/admin/login
 * Admin login with username/email + password
 */
export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: "请输入账号和密码" },
        { status: 400 }
      );
    }

    // Find admin by username or email
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [{ username: login }, { email: login }],
        isActive: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "账号不存在" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.username,
        action: "login",
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      },
    });

    // Set session cookie (using admin.id as simple token for V1)
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, admin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/login
 * Logout
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

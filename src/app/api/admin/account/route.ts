import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "admin_session";

/**
 * GET /api/admin/account
 * Return current admin account info from session cookie
 */
export async function GET(request: NextRequest) {
  try {
    const adminId = request.cookies.get(SESSION_COOKIE)?.value;

    if (!adminId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "账号不存在或已禁用" },
        { status: 401 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("GET /api/admin/account error:", error);
    return NextResponse.json(
      { error: "获取账号信息失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/account
 * Change current admin's password
 * Body: { currentPassword, newPassword }
 */
export async function PUT(request: NextRequest) {
  try {
    const adminId = request.cookies.get(SESSION_COOKIE)?.value;

    if (!adminId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId, isActive: true },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "账号不存在或已禁用" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "请输入当前密码和新密码" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码长度不能少于 6 位" },
        { status: 400 }
      );
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "当前密码错误" },
        { status: 400 }
      );
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.username,
        action: "change_password",
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      },
    });

    return NextResponse.json({ success: true, message: "密码修改成功" });
  } catch (error) {
    console.error("PUT /api/admin/account error:", error);
    return NextResponse.json(
      { error: "修改密码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

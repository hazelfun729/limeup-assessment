import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import bcrypt from "bcryptjs";

/**
 * GET /api/admin/admins — List all admin accounts
 */
export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ admins });
  } catch {
    return NextResponse.json({ error: "获取管理员列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/admins — Create a new admin account
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "仅超级管理员可创建账户" }, { status: 403 });
    }

    const { username, email, password, role } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "用户名、邮箱和密码为必填项" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const existing = await prisma.admin.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.username === username ? "用户名已存在" : "邮箱已被注册" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        email,
        passwordHash,
        role: role || "OPERATOR",
      },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ admin: newAdmin });
  } catch {
    return NextResponse.json({ error: "创建管理员失败" }, { status: 500 });
  }
}

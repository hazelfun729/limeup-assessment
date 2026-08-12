import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import bcrypt from "bcryptjs";

/**
 * PUT /api/admin/admins/[id] — Update admin (role, isActive, or password)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "仅超级管理员可修改账户" }, { status: 403 });
    }

    const { id } = await params;
    const { role, isActive, password } = await request.json();

    const updateData: Record<string, unknown> = {};

    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    // Prevent deactivating yourself
    if (id === admin.id && isActive === false) {
      return NextResponse.json({ error: "不能停用自己的账户" }, { status: 400 });
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });

    return NextResponse.json({ admin: updated });
  } catch {
    return NextResponse.json({ error: "更新管理员失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/admins/[id] — Deactivate admin (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "未登录" }, { status: 401 });
    if (admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "仅超级管理员可操作" }, { status: 403 });
    }

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: "不能停用自己的账户" }, { status: 400 });
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, username: true, isActive: true },
    });

    return NextResponse.json({ admin: updated });
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

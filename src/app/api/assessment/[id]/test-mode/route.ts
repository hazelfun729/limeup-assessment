import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { readSession } from "@/lib/security/session";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "请先登录管理员账号" }, { status: 401 });
  const { id } = await params;
  const guest = await readSession(`assessment_${id}`, "GUEST");
  if (guest?.subjectId !== id) return NextResponse.json({ error: "请从前台新建自己的测试测评" }, { status: 403 });
  const updated = await prisma.assessment.updateMany({
    where: { id, status: "IN_PROGRESS", userId: null },
    data: { source: `admin-test:${admin.id}` },
  });
  if (!updated.count) return NextResponse.json({ error: "仅支持尚未绑定用户的进行中测评" }, { status: 409 });
  return NextResponse.json({ success: true });
}

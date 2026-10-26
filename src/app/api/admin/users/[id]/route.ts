import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";

/**
 * GET /api/admin/users/[id]
 * User detail with all related data
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getAdminSession())?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        assessments: {
          include: {
            answerRecords: {
              include: { question: { include: { module: true } } },
            },
            growthProfile: true,
            handbook: true,
            payment: true,
          },
          orderBy: { startedAt: "desc" },
        },
        emails: { orderBy: { createdAt: "desc" } },
        crmContact: { include: { followUps: { orderBy: { createdAt: "desc" } } } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("User detail error:", error);
    return NextResponse.json({ error: "获取用户详情失败" }, { status: 500 });
  }
}

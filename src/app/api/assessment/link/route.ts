import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";

/**
 * POST /api/assessment/link
 * Link an assessment to the currently logged-in user
 * Body: { assessmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { assessmentId } = await request.json();
    if (!assessmentId) {
      return NextResponse.json(
        { error: "缺少测评ID" },
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

    // Link assessment to user and mark as completed
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Auto-create CRM contact if not exists
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to link assessment:", error);
    return NextResponse.json(
      { error: "绑定失败，请稍后重试" },
      { status: 500 }
    );
  }
}

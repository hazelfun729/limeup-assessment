import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * PUT /api/admin/questions/[id]
 * Update question (content, scoring, active status, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, isActive, isReverseScored, scoreValues, order, stage } = body;

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isReverseScored !== undefined) updateData.isReverseScored = isReverseScored;
    if (scoreValues !== undefined) updateData.scoreValues = scoreValues;
    if (order !== undefined) updateData.order = order;
    if (stage !== undefined) updateData.stage = stage;

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json({ error: "更新题目失败" }, { status: 500 });
  }
}

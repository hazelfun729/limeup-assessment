import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/prompts/[id]
 * Get prompt detail with all versions
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt 不存在" }, { status: 404 });
    }

    // Get all versions of this prompt
    const allVersions = await prisma.prompt.findMany({
      where: { name: prompt.name },
      orderBy: { version: "desc" },
    });

    // Get usage count (how many handbooks used this prompt)
    const usageCount = await prisma.growthHandbook.count({
      where: { promptId: id },
    });

    return NextResponse.json({
      prompt,
      versions: allVersions.map((v) => ({
        id: v.id,
        version: v.version,
        isActive: v.isActive,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
      })),
      usageCount,
    });
  } catch (error) {
    console.error("Prompt detail error:", error);
    return NextResponse.json({ error: "获取 Prompt 详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/prompts/[id]
 * Update prompt content
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
    const { content, description } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;

    const prompt = await prisma.prompt.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error("Update prompt error:", error);
    return NextResponse.json({ error: "更新 Prompt 失败" }, { status: 500 });
  }
}

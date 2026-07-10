import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/prompts/[id]/publish
 * Publish a prompt version (activate it, deactivate others)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt) {
      return NextResponse.json({ error: "Prompt 不存在" }, { status: 404 });
    }

    // Deactivate all versions of this prompt
    await prisma.prompt.updateMany({
      where: { name: prompt.name },
      data: { isActive: false },
    });

    // Activate this version
    await prisma.prompt.update({
      where: { id },
      data: { isActive: true },
    });

    // Log
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "publish_prompt",
        target: id,
        details: `发布 Prompt: ${prompt.name} v${prompt.version}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Publish prompt error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";

/**
 * POST /api/admin/prompts/[id]/publish
 * Publish a prompt version (activate it, deactivate others)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt) {
      return NextResponse.json({ error: "Prompt 不存在" }, { status: 404 });
    }

    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prompt.name}))`;
      await tx.prompt.updateMany({where:{name:prompt.name},data:{isActive:false}});
      await tx.prompt.update({where:{id},data:{isActive:true}});
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

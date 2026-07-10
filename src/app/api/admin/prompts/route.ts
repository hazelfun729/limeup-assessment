import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/prompts
 * List all prompts with latest version info
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const prompts = await prisma.prompt.findMany({
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });

    // Group by name, show latest version
    const grouped = new Map<string, typeof prompts>();
    for (const p of prompts) {
      if (!grouped.has(p.name)) {
        grouped.set(p.name, []);
      }
      grouped.get(p.name)!.push(p);
    }

    const list = Array.from(grouped.entries()).map(([name, versions]) => {
      const latest = versions[0];
      return {
        id: latest.id,
        name,
        type: latest.type,
        latestVersion: latest.version,
        isActive: latest.isActive,
        description: latest.description,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        versionCount: versions.length,
      };
    });

    return NextResponse.json({ prompts: list });
  } catch (error) {
    console.error("Prompts API error:", error);
    return NextResponse.json({ error: "获取 Prompt 列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/prompts
 * Create a new prompt
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { name, type, content, description } = await request.json();

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: "名称、类型和内容为必填项" },
        { status: 400 }
      );
    }

    // Check existing versions to determine next version number
    const existing = await prisma.prompt.findMany({
      where: { name },
      orderBy: { version: "desc" },
      take: 1,
    });
    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const prompt = await prisma.prompt.create({
      data: {
        name,
        type,
        content,
        version: nextVersion,
        isActive: false, // New versions are inactive until published
        description: description || null,
        createdBy: adminId,
      },
    });

    // Deactivate all other versions of this prompt
    await prisma.prompt.updateMany({
      where: { name, id: { not: prompt.id } },
      data: { isActive: false },
    });

    // Log
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "create_prompt",
        target: prompt.id,
        details: `创建 Prompt: ${name} v${nextVersion}`,
      },
    });

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error("Create prompt error:", error);
    return NextResponse.json({ error: "创建 Prompt 失败" }, { status: 500 });
  }
}

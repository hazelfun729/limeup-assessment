import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";

/**
 * GET /api/admin/settings
 * Get all site configuration entries
 */
export async function GET() {
  try {
    if (!(await getAdminSession())?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const configs = await prisma.siteConfig.findMany({
      where: { NOT: { key: { startsWith: "report:" } } },
      orderBy: { key: "asc" },
    });

    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return NextResponse.json({ settings: configMap });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "获取设置失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update one or more site configuration entries
 * Body: { settings: { key: value, ... } }
 */
export async function PUT(request: NextRequest) {
  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const settings = body.settings as Record<string, string>;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "参数格式错误" },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { username: true },
    });

    if (Object.keys(settings).some(key => key.startsWith("report:"))) return NextResponse.json({error:"报告运行记录不可通过网站设置修改"},{status:400});

    // Upsert each setting
    const ops = Object.entries(settings).map(([key, value]) =>
      prisma.siteConfig.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    );

    await Promise.all(ops);

    // Log operation
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "update_settings",
        target: "SiteConfig",
        details: JSON.stringify(Object.keys(settings)),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "更新设置失败" },
      { status: 500 }
    );
  }
}

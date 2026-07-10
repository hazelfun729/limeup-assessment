import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/thresholds
 * Get current score thresholds
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const thresholds = await prisma.scoreThreshold.findMany({
      where: { isActive: true },
      orderBy: { minValue: "asc" },
    });

    return NextResponse.json({ thresholds });
  } catch (error) {
    console.error("Thresholds API error:", error);
    return NextResponse.json({ error: "获取阈值配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/thresholds
 * Update score thresholds (batch)
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { thresholds } = await request.json();

    if (!Array.isArray(thresholds)) {
      return NextResponse.json({ error: "阈值数据格式错误" }, { status: 400 });
    }

    // Deactivate all current thresholds
    await prisma.scoreThreshold.updateMany({
      data: { isActive: false },
    });

    // Create new thresholds
    const created = await Promise.all(
      thresholds.map((t: { level: string; minValue: number; maxValue: number }) =>
        prisma.scoreThreshold.create({
          data: {
            level: t.level,
            minValue: t.minValue,
            maxValue: t.maxValue,
            isActive: true,
          },
        })
      )
    );

    // Log
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "update_thresholds",
        details: `更新阈值: ${thresholds.map((t: { level: string; minValue: number; maxValue: number }) => `${t.level}(${t.minValue}-${t.maxValue})`).join(", ")}`,
      },
    });

    return NextResponse.json({ success: true, thresholds: created });
  } catch (error) {
    console.error("Update thresholds error:", error);
    return NextResponse.json({ error: "更新阈值失败" }, { status: 500 });
  }
}

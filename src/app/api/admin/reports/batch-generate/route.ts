import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/reports/batch-generate
 * Batch generate AI reports for handbooks in ANALYZING status
 * Body: { handbookIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { handbookIds } = await request.json();
    if (!Array.isArray(handbookIds) || handbookIds.length === 0) {
      return NextResponse.json({ error: "请选择要生成的报告" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const hid of handbookIds) {
      try {
        const handbook = await prisma.growthHandbook.findUnique({
          where: { id: hid },
          include: { assessment: true },
        });

        if (!handbook) {
          results.push({ id: hid, success: false, error: "报告不存在" });
          continue;
        }

        const assessmentId = handbook.assessmentId;

        // Ensure GrowthProfile exists
        const existingProfile = await prisma.growthProfile.findUnique({
          where: { assessmentId },
        });
        if (!existingProfile) {
          const { generateProfile, saveProfile } = await import("@/lib/scoring/profile");
          const generated = await generateProfile({ assessmentId });
          if (generated) {
            await saveProfile(assessmentId, handbook.userId, generated);
          }
        }

        // Generate handbook
        const { generateHandbook } = await import("@/lib/report/generator");
        await generateHandbook(assessmentId);

        // Log
        await prisma.operationLog.create({
          data: {
            adminId,
            adminName: admin?.username || "unknown",
            action: "batch_generate_report",
            target: hid,
            details: `批量生成报告: assessment=${assessmentId}`,
          },
        });

        results.push({ id: hid, success: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: hid, success: false, error: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      total: handbookIds.length,
      generated: successCount,
      failed: handbookIds.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    return NextResponse.json({ error: "批量生成失败" }, { status: 500 });
  }
}

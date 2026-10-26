import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import { dispatchReportGeneration } from "@/lib/report/dispatch";

/**
 * POST /api/admin/reports/batch-generate
 * Batch generate AI reports for handbooks in ANALYZING status
 * Body: { handbookIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { handbookIds } = await request.json();
    if (!Array.isArray(handbookIds) || handbookIds.length === 0 || handbookIds.length > 10 || !handbookIds.every((id) => typeof id === "string") || new Set(handbookIds).size !== handbookIds.length) {
      return NextResponse.json({ error: "一次请选择 1–10 份报告" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    const results: Array<{ id: string; success: boolean; outcome?: string; error?: string }> = [];

    for (const hid of handbookIds) {
      try {
        const handbook = await prisma.growthHandbook.findUnique({
          where: { id: hid },
          select: { assessmentId: true, status: true },
        });

        if (!handbook) {
          results.push({ id: hid, success: false, error: "报告不存在" });
          continue;
        }
        if (handbook.status !== "ANALYZING" && handbook.status !== "FAILED") {
          results.push({ id: hid, success: false, error: "当前报告状态不支持批量生成" });
          continue;
        }

        const assessmentId = handbook.assessmentId;

        const generation = await dispatchReportGeneration(assessmentId, request.url);

        // Log
        await prisma.operationLog.create({
          data: {
            adminId,
            adminName: admin?.username || "unknown",
            action: "batch_generate_report",
            target: hid,
            details: `批量生成报告: assessment=${assessmentId}, result=${generation.outcome}`,
          },
        });

        results.push({ id: hid, success: true, outcome: generation.outcome });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: hid, success: false, error: msg });
      }
    }

    const generated = results.filter((r) => r.outcome === "QUEUED" || r.outcome === "GENERATED").length;
    const alreadyQueued = results.filter((r) => r.outcome === "ALREADY_QUEUED").length;
    const skipped = results.filter((r) => r.outcome === "SKIPPED").length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: handbookIds.length,
      generated,
      alreadyQueued,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    return NextResponse.json({ error: "批量生成失败" }, { status: 500 });
  }
}

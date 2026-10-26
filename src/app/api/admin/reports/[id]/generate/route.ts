import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import { ReportBusyError } from "@/lib/report/pipeline";
import { dispatchReportGeneration, ReportDispatchUncertainError } from "@/lib/report/dispatch";

/**
 * POST /api/admin/reports/[id]/generate
 * Trigger AI report generation for a handbook
 * Also supports ?assessmentId=xxx to generate for an assessment directly
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const assessmentIdFromQuery = url.searchParams.get("assessmentId");

    // Determine the assessment ID
    let assessmentId: string;

    if (assessmentIdFromQuery) {
      assessmentId = assessmentIdFromQuery;
    } else {
      // id could be handbook ID or assessment ID
      const handbook = await prisma.growthHandbook.findUnique({ where: { id } });
      if (handbook) {
        assessmentId = handbook.assessmentId;
      } else {
        // Try as assessment ID
        const assessment = await prisma.assessment.findUnique({ where: { id } });
        if (!assessment) {
          return NextResponse.json({ error: "记录不存在" }, { status: 404 });
        }
        assessmentId = id;
      }
    }

    // Verify assessment exists and is completed
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true, userId: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }
    if (assessment.status !== "COMPLETED") {
      return NextResponse.json({ error: "测评未完成，无法生成报告" }, { status: 400 });
    }
    if (!assessment.userId) {
      return NextResponse.json({ error: "用户未注册，无法生成报告" }, { status: 400 });
    }


    // Generate handbook
    const result = await dispatchReportGeneration(assessmentId, request.url, true);

    // Log operation
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "generate_report",
        target: result.handbookId || assessmentId,
        details: `生成报告: assessment=${assessmentId}, result=${result.outcome}`,
      },
    });

    return NextResponse.json({
      success: true,
      handbookId: result.handbookId,
      status: result.status,
      queued: result.queued,
      outcome: result.outcome,
    });
  } catch (error: unknown) {
    if (error instanceof ReportDispatchUncertainError) {
      return NextResponse.json({ success: true, queued: true, status: "ANALYZING", warning: error.message }, { status: 202 });
    }
    if (error instanceof ReportBusyError) return NextResponse.json({error:error.message},{status:409});
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Report generation error:", msg);

    return NextResponse.json({ error: `报告生成失败: ${msg}` }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateHandbook } from "@/lib/report/generator";

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
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
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

    // Ensure GrowthProfile exists (needed for report generation)
    const existingProfile = await prisma.growthProfile.findUnique({
      where: { assessmentId },
    });
    if (!existingProfile) {
      // Generate profile on the fly
      const { generateProfile, saveProfile } = await import("@/lib/scoring/profile");
      const generated = await generateProfile({ assessmentId });
      if (generated) {
        await saveProfile(assessmentId, assessment.userId, generated);
      } else {
        return NextResponse.json({ error: "无法生成成长画像，请确保已完成全部题目" }, { status: 400 });
      }
    }

    // Generate handbook
    const result = await generateHandbook(assessmentId);

    // Log operation
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "generate_report",
        target: result.handbookId,
        details: `生成报告: assessment=${assessmentId}`,
      },
    });

    return NextResponse.json({
      success: true,
      handbookId: result.handbookId,
      status: "REVIEWING",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Report generation error:", msg);
    return NextResponse.json({ error: `报告生成失败: ${msg}` }, { status: 500 });
  }
}

import { cleanReportHtml } from "@/lib/security/report-html";
import { assessmentAccess } from "@/lib/security/assessment";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const handbook = await prisma.growthHandbook.findUnique({
      where: { id },
      include: {
        assessment: {
          include: {
            growthProfile: true,
          },
        },
      },
    });

    if (!handbook) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const denied = await assessmentAccess(handbook.assessmentId, false);
    if (denied) return denied;
    if (handbook.status !== "SENT") {
      return NextResponse.json({ error: "报告尚在制作或审核中" }, { status: 409 });
    }
    const profile = handbook.assessment?.growthProfile;

    return NextResponse.json({
      handbook: {
        id: handbook.id,
        contentHtml: cleanReportHtml(handbook.contentHtml || handbook.aiRawOutput),
        aiRawOutput: null,

        status: handbook.status,
        version: handbook.version,
        createdAt: handbook.createdAt,
      },
      assessment: {
        id: handbook.assessment?.id,
        studentName: handbook.assessment?.studentName,
        parentName: handbook.assessment?.parentName,
        studentGender: handbook.assessment?.studentGender,
        grade: handbook.assessment?.grade,
        startedAt: handbook.assessment?.startedAt,
      },
      profile: profile ? {
        learningMode: profile.learningMode,
        learningModeName: profile.learningModeName,
        learningModeEmoji: profile.learningModeEmoji,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        growthFocus: profile.growthFocus,
        growthFocusDetail: profile.growthFocusDetail,
        summary: profile.summary,
      } : null,
    });
  } catch (error: unknown) {
    console.error("Report retrieval failed", error);
    return NextResponse.json({ error: "获取报告失败" }, { status: 500 });
  }
}

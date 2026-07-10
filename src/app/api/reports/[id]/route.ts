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

    const profile = handbook.assessment?.growthProfile;

    return NextResponse.json({
      handbook: {
        id: handbook.id,
        contentHtml: handbook.contentHtml,
        aiRawOutput: handbook.aiRawOutput,
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
        systemScores: profile.systemScores,
        dimensionScores: profile.dimensionScores,
        moduleScores: profile.moduleScores,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        growthFocus: profile.growthFocus,
        growthFocusDetail: profile.growthFocusDetail,
        summary: profile.summary,
      } : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

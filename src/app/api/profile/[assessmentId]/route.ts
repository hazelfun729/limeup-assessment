import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProfile, saveProfile } from "@/lib/scoring/profile";

/**
 * GET /api/profile/[assessmentId]
 * Get or generate growth profile for an assessment
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    // Check if profile already exists
    const existingProfile = await prisma.growthProfile.findUnique({
      where: { assessmentId },
      include: {
        assessment: {
          select: { status: true, userId: true },
        },
      },
    });

    if (existingProfile) {
      return NextResponse.json({
        id: existingProfile.id,
        learningMode: existingProfile.learningMode,
        learningModeName: existingProfile.learningModeName,
        learningModeEmoji: existingProfile.learningModeEmoji,
        summary: existingProfile.summary,
        systemScores: existingProfile.systemScores,
        dimensionScores: existingProfile.dimensionScores,
        moduleScores: existingProfile.moduleScores,
        strengths: existingProfile.strengths,
        weaknesses: existingProfile.weaknesses,
        growthFocus: existingProfile.growthFocus,
        growthFocusDetail: existingProfile.growthFocusDetail,
        actionSuggestion: existingProfile.actionSuggestion,
      });
    }

    // Check assessment is completed
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true, userId: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "测评不存在" },
        { status: 404 }
      );
    }

    if (assessment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "测评未完成" },
        { status: 400 }
      );
    }

    if (!assessment.userId) {
      return NextResponse.json(
        { error: "用户未注册" },
        { status: 400 }
      );
    }

    // ==========================================
    // Growth Engine: Calculate real profile
    // ==========================================
    const generated = await generateProfile({ assessmentId });

    if (!generated) {
      return NextResponse.json(
        { error: "无法生成成长画像，请确保已完成全部题目" },
        { status: 400 }
      );
    }

    // Save to database
    await saveProfile(assessmentId, assessment.userId, generated);

    return NextResponse.json({
      learningMode: generated.learningMode,
      learningModeName: generated.learningModeName,
      learningModeEmoji: generated.learningModeEmoji,
      summary: generated.summary,
      systemScores: generated.systemScores,
      dimensionScores: generated.dimensionScores,
      moduleScores: generated.moduleScores,
      growthFocus: generated.growthFocus,
      growthFocusDetail: generated.growthFocusDetail,
      actionSuggestion: generated.actionSuggestion,
    });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json(
      { error: "获取成长画像失败" },
      { status: 500 }
    );
  }
}

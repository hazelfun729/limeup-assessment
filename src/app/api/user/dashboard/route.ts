import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user/auth";

/**
 * GET /api/user/dashboard
 * Aggregated dashboard data for user center
 */
export async function GET() {
  try {
    const user = await requireUser();

    // Fetch all user data in parallel
    const [assessments, profiles, handbooks, payments] = await Promise.all([
      prisma.assessment.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          currentQuestion: true,
          startedAt: true,
          completedAt: true,
          studentName: true,
          grade: true,
        },
      }),
      prisma.growthProfile.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          assessmentId: true,
          learningMode: true,
          learningModeName: true,
          learningModeEmoji: true,
          systemScores: true,
          growthFocus: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.growthHandbook.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          assessmentId: true,
          status: true,
          createdAt: true,
          sentAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          assessmentId: true,
          status: true,
          amount: true,
          createdAt: true,
        },
      }),
    ]);

    // Build handbook status map by assessmentId
    const handbookMap = new Map(
      handbooks.map((h) => [h.assessmentId, h])
    );

    // Build payment status map by assessmentId
    const paymentMap = new Map(
      payments.map((p) => [p.assessmentId, p])
    );

    // Build profile map by assessmentId
    const profileMap = new Map(
      profiles.map((p) => [p.assessmentId, p])
    );

    // Combine assessments with their related data
    const assessmentList = assessments.map((a) => {
      const handbook = handbookMap.get(a.id);
      const payment = paymentMap.get(a.id);
      const profile = profileMap.get(a.id);

      return {
        ...a,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() || null,
        profile: profile
          ? {
              learningMode: profile.learningMode,
              learningModeName: profile.learningModeName,
              learningModeEmoji: profile.learningModeEmoji,
              systemScores: profile.systemScores,
              growthFocus: profile.growthFocus,
              summary: profile.summary,
              createdAt: (profile.createdAt as Date).toISOString(),
            }
          : null,
        handbookStatus: handbook?.status || null,
        handbookSentAt: handbook?.sentAt?.toISOString() || null,
        paymentStatus: payment?.status || null,
        paymentAmount: payment?.amount?.toString() || null,
      };
    });

    // Growth curve data: system scores over time from profiles
    const growthCurve = profiles
      .filter((p) => p.systemScores)
      .map((p) => ({
        assessmentId: p.assessmentId,
        date: (p.createdAt as Date).toISOString(),
        learningMode: p.learningModeName || p.learningMode,
        systemScores: p.systemScores,
      }))
      .reverse(); // chronological order

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: (user.createdAt as Date).toISOString(),
      },
      assessments: assessmentList,
      growthCurve,
      stats: {
        totalAssessments: assessments.length,
        completedAssessments: assessments.filter(
          (a) => a.status === "COMPLETED"
        ).length,
        hasHandbook: handbooks.length > 0,
        latestAssessmentId: assessments[0]?.id || null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Dashboard fetch failed:", error);
    return NextResponse.json(
      { error: "获取数据失败" },
      { status: 500 }
    );
  }
}

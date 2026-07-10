import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/stats
 * Overall platform statistics: totals, trends, conversion funnel
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalAssessments,
      totalUsers,
      totalPayments,
      totalRevenue,
      completedAssessments,
      inProgressAssessments,
      todayAssessments,
      todayUsers,
      todayPayments,
      weekAssessments,
      weekUsers,
      monthAssessments,
      monthUsers,
      monthRevenue,
      pendingPayments,
      confirmedPayments,
      handbooksAnalyzing,
      handbooksReviewing,
      handbooksSent,
      // Learning mode distribution
      profileCount,
    ] = await Promise.all([
      prisma.assessment.count(),
      prisma.user.count(),
      prisma.payment.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "CONFIRMED" },
      }),
      prisma.assessment.count({ where: { status: "COMPLETED" } }),
      prisma.assessment.count({ where: { status: "IN_PROGRESS" } }),
      prisma.assessment.count({ where: { startedAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.payment.count({ where: { createdAt: { gte: today } } }),
      prisma.assessment.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.assessment.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "CONFIRMED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "CONFIRMED" } }),
      prisma.growthHandbook.count({ where: { status: "ANALYZING" } }),
      prisma.growthHandbook.count({ where: { status: "REVIEWING" } }),
      prisma.growthHandbook.count({ where: { status: "SENT" } }),
      prisma.growthProfile.count(),
    ]);

    // Conversion funnel
    const registrationRate =
      totalAssessments > 0
        ? Math.round((totalUsers / totalAssessments) * 100)
        : 0;
    const paymentRate =
      totalUsers > 0
        ? Math.round((confirmedPayments / totalUsers) * 100)
        : 0;

    return NextResponse.json({
      overview: {
        totalAssessments,
        totalUsers,
        totalPayments: confirmedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        completedAssessments,
        inProgressAssessments,
        profileCount,
      },
      today: {
        assessments: todayAssessments,
        users: todayUsers,
        payments: todayPayments,
      },
      week: {
        assessments: weekAssessments,
        users: weekUsers,
      },
      month: {
        assessments: monthAssessments,
        users: monthUsers,
        revenue: monthRevenue._sum.amount || 0,
      },
      funnel: {
        registrationRate,
        paymentRate,
      },
      queue: {
        pendingPayments,
        handbooksAnalyzing,
        handbooksReviewing,
        handbooksSent,
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}

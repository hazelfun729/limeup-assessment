import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";

/**
 * GET /api/admin/dashboard
 * Dashboard metrics: today's stats + status queue counters
 */
export async function GET() {
  try {
    // Verify admin session
    const sessionId = (await getAdminSession())?.id;
    if (!sessionId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      todayAssessments,
      todayCompletions,
      todayRegistrations,
      todayPayments,
      pendingPayments,
      analyzingReports,
      reviewingReports,
      sendingReports,
      sentReports,
      failedReports,
    ] = await Promise.all([
      // Today's assessment starts
      prisma.assessment.count({
        where: { startedAt: { gte: today } },
      }),
      // Today's completions
      prisma.assessment.count({
        where: { completedAt: { gte: today } },
      }),
      // Today's registrations
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      // Today's payments
      prisma.payment.count({
        where: { createdAt: { gte: today } },
      }),
      // Status queue counters
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.growthHandbook.count({ where: { status: "ANALYZING" } }),
      prisma.growthHandbook.count({ where: { status: "REVIEWING" } }),
      prisma.growthHandbook.count({ where: { status: "SENDING" } }),
      prisma.growthHandbook.count({ where: { status: "SENT" } }),
      prisma.growthHandbook.count({ where: { status: "FAILED" } }),
    ]);

    return NextResponse.json({
      today: {
        assessments: todayAssessments,
        completions: todayCompletions,
        registrations: todayRegistrations,
        payments: todayPayments,
      },
      queue: {
        pendingPayments,
        analyzingReports,
        reviewingReports,
        sendingReports,
        sentReports,
        failedReports,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "获取数据失败" },
      { status: 500 }
    );
  }
}

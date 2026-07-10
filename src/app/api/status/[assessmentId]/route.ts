import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/status/[assessmentId]
 * Get order + report status for the status tracking page
 *
 * Status flow (from PRD §7):
 * 1. PENDING       — 等待付款确认
 * 2. ANALYZING     — 手册分析中
 * 3. REVIEWING     — 老师审核中
 * 4. SENDING       — 报告发送中
 * 5. SENT          — 报告已发送
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { assessmentId },
      select: { status: true, confirmedAt: true },
    });

    const handbook = await prisma.growthHandbook.findUnique({
      where: { assessmentId },
      select: { status: true, sentAt: true, sentTo: true },
    });

    // Determine current status
    let currentStatus: string;
    if (!payment || payment.status === "PENDING") {
      currentStatus = "PENDING";
    } else if (!handbook) {
      currentStatus = "ANALYZING";
    } else if (handbook.status === "ANALYZING") {
      currentStatus = "ANALYZING";
    } else if (handbook.status === "REVIEWING" || handbook.status === "NEEDS_MANUAL_REVIEW") {
      currentStatus = "REVIEWING";
    } else if (handbook.status === "SENDING") {
      currentStatus = "SENDING";
    } else if (handbook.status === "SENT") {
      currentStatus = "SENT";
    } else if (handbook.status === "FAILED") {
      currentStatus = "FAILED";
    } else {
      currentStatus = "PENDING";
    }

    return NextResponse.json({
      currentStatus,
      payment: payment
        ? { status: payment.status, confirmedAt: payment.confirmedAt }
        : null,
      handbook: handbook
        ? { status: handbook.status, sentAt: handbook.sentAt, sentTo: handbook.sentTo }
        : null,
    });
  } catch (error) {
    console.error("Failed to get status:", error);
    return NextResponse.json(
      { error: "获取状态失败" },
      { status: 500 }
    );
  }
}

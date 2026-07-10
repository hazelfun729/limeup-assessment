import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/payment/[assessmentId]
 * Get payment status for an assessment
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { assessmentId },
    });

    if (!payment) {
      return NextResponse.json({ status: null });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      orderNo: payment.orderNo,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    console.error("Failed to get payment:", error);
    return NextResponse.json(
      { error: "获取支付信息失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment/[assessmentId]
 * Create a payment record (user clicked "我已支付")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { screenshot } = body as { screenshot?: string };

    // Verify assessment exists and is completed
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "测评不存在" },
        { status: 404 }
      );
    }

    if (!assessment.userId) {
      return NextResponse.json(
        { error: "用户未注册" },
        { status: 400 }
      );
    }

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { assessmentId },
      create: {
        userId: assessment.userId,
        assessmentId,
        amount: "9.9",
        originalAmount: "99",
        method: "WECHAT_PAY",
        status: "PENDING",
        screenshot: screenshot || null,
        orderNo: `LV3-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      },
      update: {
        screenshot: screenshot || undefined,
      },
    });

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      orderNo: payment.orderNo,
    });
  } catch (error) {
    console.error("Failed to create payment:", error);
    return NextResponse.json(
      { error: "创建支付记录失败" },
      { status: 500 }
    );
  }
}

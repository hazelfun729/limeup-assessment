import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/payments/[id]/confirm
 * Confirm a pending payment
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json({ error: "支付记录不存在" }, { status: 404 });
    }
    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "该支付记录已处理" }, { status: 400 });
    }

    // Confirm payment
    await prisma.payment.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedBy: adminId,
        confirmedAt: new Date(),
      },
    });

    // Create GrowthHandbook record
    const existingHandbook = await prisma.growthHandbook.findUnique({
      where: { assessmentId: payment.assessmentId },
    });
    if (!existingHandbook) {
      await prisma.growthHandbook.create({
        data: {
          userId: payment.userId,
          assessmentId: payment.assessmentId,
          status: "ANALYZING",
        },
      });
    }

    // Log operation
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: "confirm_payment",
        target: id,
        details: `确认支付: 订单${payment.orderNo}`,
      },
    });

    // Auto-trigger report generation (async, don't block response)
    let reportStatus = "ANALYZING";
    try {
      // Ensure GrowthProfile exists
      const existingProfile = await prisma.growthProfile.findUnique({
        where: { assessmentId: payment.assessmentId },
      });
      if (!existingProfile) {
        const { generateProfile, saveProfile } = await import("@/lib/scoring/profile");
        const generated = await generateProfile({ assessmentId: payment.assessmentId });
        if (generated) {
          await saveProfile(payment.assessmentId, payment.userId, generated);
        }
      }

      // Generate handbook
      const { generateHandbook } = await import("@/lib/report/generator");
      await generateHandbook(payment.assessmentId);
      reportStatus = "REVIEWING";
    } catch (genError: unknown) {
      const msg = genError instanceof Error ? genError.message : String(genError);
      console.error("Auto report generation failed:", msg);
      // Keep ANALYZING status, admin can retry manually
    }

    return NextResponse.json({ success: true, reportStatus });
  } catch (error) {
    console.error("Confirm payment error:", error);
    return NextResponse.json({ error: "确认失败" }, { status: 500 });
  }
}

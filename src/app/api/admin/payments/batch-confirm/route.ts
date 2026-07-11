import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/payments/batch-confirm
 * Batch confirm pending payments
 * Body: { paymentIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { paymentIds } = await request.json();
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: "请选择要确认的支付记录" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    const results: Array<{ id: string; success: boolean; error?: string; reportStatus?: string }> = [];

    for (const pid of paymentIds) {
      try {
        const payment = await prisma.payment.findUnique({ where: { id: pid } });
        if (!payment) {
          results.push({ id: pid, success: false, error: "支付记录不存在" });
          continue;
        }
        if (payment.status !== "PENDING") {
          results.push({ id: pid, success: false, error: "已处理" });
          continue;
        }

        await prisma.payment.update({
          where: { id: pid },
          data: {
            status: "CONFIRMED",
            confirmedBy: adminId,
            confirmedAt: new Date(),
          },
        });

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

        let reportStatus = "ANALYZING";
        try {
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
          const { generateHandbook } = await import("@/lib/report/generator");
          await generateHandbook(payment.assessmentId);
          reportStatus = "REVIEWING";
        } catch (genError: unknown) {
          const msg = genError instanceof Error ? genError.message : String(genError);
          console.error(`Auto generation failed for ${payment.assessmentId}:`, msg);
        }

        await prisma.operationLog.create({
          data: {
            adminId,
            adminName: admin?.username || "unknown",
            action: "batch_confirm_payment",
            target: pid,
            details: `批量确认支付: 订单${payment.orderNo}`,
          },
        });

        results.push({ id: pid, success: true, reportStatus });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: pid, success: false, error: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      total: paymentIds.length,
      confirmed: successCount,
      failed: paymentIds.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Batch confirm error:", error);
    return NextResponse.json({ error: "批量确认失败" }, { status: 500 });
  }
}

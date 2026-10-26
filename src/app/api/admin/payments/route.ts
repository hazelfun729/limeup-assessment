import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, phone: true } },
          assessment: { select: { id: true, studentName: true, handbook: { select: { id: true } } } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        userEmail: p.user.email,
        userPhone: p.user.phone,
        amount: p.amount,
        status: p.status,
        method: p.method,
        orderNo: p.orderNo,
        wechatTransactionId: p.wechatTransactionId,
        screenshot: p.screenshot,
        remark: p.remark,
        confirmedBy: p.confirmedBy,
        confirmedAt: p.confirmedAt,
        assessmentId: p.assessment.id,
        studentName: p.assessment.studentName,
        reportId: p.assessment.handbook?.id ?? null,
        createdAt: p.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Payments API error:", error);
    return NextResponse.json({ error: "获取支付列表失败" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/assessments
 * Assessment list with filters, search, pagination
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { studentName: { contains: search } },
        { parentName: { contains: search } },
        { id: { contains: search } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { email: true, phone: true } },
          answerRecords: { select: { id: true } },
          growthProfile: {
            select: {
              learningMode: true,
              learningModeName: true,
              growthFocus: true,
            },
          },
          handbook: {
            select: { status: true },
          },
          payment: {
            select: { status: true, amount: true },
          },
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    return NextResponse.json({
      assessments: assessments.map((a) => ({
        id: a.id,
        status: a.status,
        studentName: a.studentName,
        parentName: a.parentName,
        grade: a.grade,
        phone: a.phone,
        userEmail: a.user?.email || null,
        answersCount: a.answerRecords.length,
        learningMode: a.growthProfile?.learningModeName || null,
        growthFocus: a.growthProfile?.growthFocus || null,
        handbookStatus: a.handbook?.status || null,
        paymentStatus: a.payment?.status || null,
        paymentAmount: a.payment?.amount || null,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        source: a.source,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin assessments API error:", error);
    return NextResponse.json(
      { error: "获取测评列表失败" },
      { status: 500 }
    );
  }
}

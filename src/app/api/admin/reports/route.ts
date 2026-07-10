import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;

    const [handbooks, total] = await Promise.all([
      prisma.growthHandbook.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
          assessment: {
            include: {
              growthProfile: {
                select: {
                  learningModeName: true,
                  growthFocus: true,
                },
              },
            },
          },
        },
      }),
      prisma.growthHandbook.count({ where }),
    ]);

    return NextResponse.json({
      reports: handbooks.map((h) => ({
        id: h.id,
        assessmentId: h.assessmentId,
        userEmail: h.user.email,
        studentName: h.assessment.studentName,
        parentName: h.assessment.parentName,
        grade: h.assessment.grade,
        learningMode: h.assessment.growthProfile?.learningModeName || null,
        growthFocus: h.assessment.growthProfile?.growthFocus || null,
        status: h.status,
        reviewedBy: h.reviewedBy,
        reviewedAt: h.reviewedAt,
        sentAt: h.sentAt,
        createdAt: h.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "获取报告列表失败" }, { status: 500 });
  }
}

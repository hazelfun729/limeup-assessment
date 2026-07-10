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

    const skip = (page - 1) * pageSize;

    // Fetch GrowthHandbook records
    const handbookWhere: Record<string, unknown> = {};
    if (status && status !== "AWAITING_PAYMENT") {
      handbookWhere.status = status;
    }

    const shouldFetchHandbooks = status === "" || (status !== "AWAITING_PAYMENT");
    const shouldFetchPayments = status === "" || status === "AWAITING_PAYMENT";

    const [handbooks, handbookTotal, payments, paymentTotal] = await Promise.all([
      shouldFetchHandbooks
        ? prisma.growthHandbook.findMany({
            where: handbookWhere,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { email: true } },
              assessment: {
                include: {
                  growthProfile: {
                    select: { learningModeName: true, growthFocus: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldFetchHandbooks
        ? prisma.growthHandbook.count({ where: handbookWhere })
        : Promise.resolve(0),
      shouldFetchPayments
        ? prisma.payment.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { email: true } },
              assessment: {
                select: {
                  studentName: true,
                  parentName: true,
                  grade: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldFetchPayments
        ? prisma.payment.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
    ]);

    // Build unified report list
    type ReportItem = {
      id: string;
      assessmentId: string;
      userEmail: string;
      studentName: string | null;
      parentName: string | null;
      grade: string | null;
      learningMode: string | null;
      growthFocus: string | null;
      status: string;
      paymentId: string | null;
      reviewedBy: string | null;
      reviewedAt: string | null;
      sentAt: string | null;
      createdAt: string;
    };

    const items: ReportItem[] = [];

    // Add handbook entries
    for (const h of handbooks) {
      items.push({
        id: h.id,
        assessmentId: h.assessmentId,
        userEmail: h.user.email,
        studentName: h.assessment.studentName,
        parentName: h.assessment.parentName,
        grade: h.assessment.grade,
        learningMode: h.assessment.growthProfile?.learningModeName || null,
        growthFocus: h.assessment.growthProfile?.growthFocus || null,
        status: h.status,
        paymentId: null,
        reviewedBy: h.reviewedBy,
        reviewedAt: h.reviewedAt?.toISOString() ?? null,
        sentAt: h.sentAt?.toISOString() ?? null,
        createdAt: h.createdAt.toISOString(),
      });
    }

    // Add pending payment entries (virtual "AWAITING_PAYMENT" entries)
    for (const p of payments) {
      // Skip if this assessment already has a GrowthHandbook
      const existingHandbook = handbooks.find((h) => h.assessmentId === p.assessmentId);
      if (existingHandbook) continue;

      items.push({
        id: `pending_${p.id}`,
        assessmentId: p.assessmentId,
        userEmail: p.user.email,
        studentName: p.assessment.studentName,
        parentName: p.assessment.parentName,
        grade: p.assessment.grade,
        learningMode: null,
        growthFocus: null,
        status: "AWAITING_PAYMENT",
        paymentId: p.id,
        reviewedBy: null,
        reviewedAt: null,
        sentAt: null,
        createdAt: p.createdAt.toISOString(),
      });
    }

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + pageSize);

    return NextResponse.json({
      reports: paginatedItems,
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

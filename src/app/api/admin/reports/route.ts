import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaleReportJob, parseReportJob } from "@/lib/report/job";
import { getAdminSession } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10) || 20));
    const status = searchParams.get("status") || "";

    const skip = (page - 1) * pageSize;

    const handbookWhere = status && status !== "AWAITING_PAYMENT"
      ? { status: status as "ANALYZING" | "REVIEWING" | "SENDING" | "SENT" | "FAILED" | "NEEDS_MANUAL_REVIEW" }
      : {};
    const paymentWhere = { status: "PENDING" as const, assessment: { handbook: { is: null } } };
    const includeHandbooks = status !== "AWAITING_PAYMENT";
    const includePayments = status === "" || status === "AWAITING_PAYMENT";
    // For a mixed page, at most the first skip + pageSize records of either
    // source can appear on that page. Avoid loading full reports from Supabase.
    const mixedLimit = skip + pageSize;
    const [handbooks, handbookCount, payments, paymentCount] = await Promise.all([
      includeHandbooks
        ? prisma.growthHandbook.findMany({
            where: handbookWhere,
            orderBy: { createdAt: "desc" },
            skip: includePayments ? 0 : skip,
            take: includePayments ? mixedLimit : pageSize,
            select: {
              id: true, assessmentId: true, status: true, reviewedBy: true,
              reviewedAt: true, sentAt: true, createdAt: true,
              user: { select: { email: true } },
              assessment: { select: {
                studentName: true, parentName: true, grade: true,
                growthProfile: { select: { learningModeName: true, growthFocus: true } },
              } },
            },
          })
        : Promise.resolve([]),
      includeHandbooks ? prisma.growthHandbook.count({ where: handbookWhere }) : Promise.resolve(0),
      includePayments
        ? prisma.payment.findMany({
            where: paymentWhere,
            orderBy: { createdAt: "desc" },
            skip: includeHandbooks ? 0 : skip,
            take: includeHandbooks ? mixedLimit : pageSize,
            select: {
              id: true, assessmentId: true, createdAt: true,
              user: { select: { email: true } },
              assessment: { select: { studentName: true, parentName: true, grade: true } },
            },
          })
        : Promise.resolve([]),
      includePayments ? prisma.payment.count({ where: paymentWhere }) : Promise.resolve(0),
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
    const total = handbookCount + paymentCount;
    const paginatedItems = includeHandbooks && includePayments
      ? items.slice(skip, skip + pageSize)
      : items;
    const analyzingIds = paginatedItems.filter((item) => item.status === "ANALYZING").map((item) => item.assessmentId);
    const jobRows = analyzingIds.length ? await prisma.siteConfig.findMany({
      where: { key: { in: analyzingIds.map((id) => `report:job:${id}`) } },
      select: { key: true, value: true },
    }) : [];
    const jobIssues = new Map<string, string>();
    for (const row of jobRows) {
      try {
        const job = parseReportJob(row.value);
        if (job.state === "FAILED") jobIssues.set(job.assessmentId, "任务失败，可核查后重试");
        else if (isStaleReportJob(job)) jobIssues.set(job.assessmentId, "任务超时，可核查后重试");
      } catch {
        jobIssues.set(row.key.slice("report:job:".length), "任务记录异常，需人工核查");
      }
    }

    return NextResponse.json({
      reports: paginatedItems.map((item) => ({ ...item, jobIssue: jobIssues.get(item.assessmentId) ?? null })),
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

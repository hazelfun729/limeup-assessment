import { cleanReportHtml } from "@/lib/security/report-html";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import { reportDeliveryId } from "@/lib/report/send";
import { getReportJob, isStaleReportJob } from "@/lib/report/job";

const answerRecordsQuery = {
  include: {
    question: {
      include: { module: { include: { dimension: { include: { system: true } } } } },
    },
  },
  orderBy: { answeredAt: "asc" },
} as const;

const userQuery = { select: { email: true, phone: true, emailVerified: true } } as const;
const handbookQuery = {
  user: userQuery,
  assessment: {
    include: { answerRecords: answerRecordsQuery, growthProfile: true, payment: true },
  },
} as const;
const assessmentQuery = {
  user: userQuery,
  answerRecords: answerRecordsQuery,
  growthProfile: true,
  payment: true,
} as const;

/**
 * GET /api/admin/reports/[id]
 * Full report detail for review page (three-zone layout)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getAdminSession())?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    // Try lookup by handbook.id first, then by assessmentId
    let handbook = await prisma.growthHandbook.findUnique({
      where: { id },
      include: handbookQuery,
    });

    // If not found by handbook id, try by assessmentId
    if (!handbook) {
      handbook = await prisma.growthHandbook.findUnique({
        where: { assessmentId: id },
        include: handbookQuery,
      });
    }

    // If still no handbook, check for PENDING payment (AWAITING_PAYMENT state)
    if (!handbook) {
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: assessmentQuery,
      });

      if (assessment && assessment.payment && assessment.payment.status === "PENDING") {
        return NextResponse.json({
          status: "AWAITING_PAYMENT",
          paymentId: assessment.payment.id,
          user: {
            email: assessment.user?.email || "",
            phone: assessment.user?.phone || null,
          },
          assessment: {
            studentName: assessment.studentName,
            parentName: assessment.parentName,
            grade: assessment.grade,
            studentGender: assessment.studentGender,
            interests: assessment.interests,
            status: assessment.status,
          },
          profile: assessment.growthProfile
            ? {
                learningMode: assessment.growthProfile.learningMode,
                learningModeName: assessment.growthProfile.learningModeName,
                learningModeEmoji: assessment.growthProfile.learningModeEmoji,
                systemScores: assessment.growthProfile.systemScores,
                dimensionScores: assessment.growthProfile.dimensionScores,
                moduleScores: assessment.growthProfile.moduleScores,
                strengths: assessment.growthProfile.strengths,
                weaknesses: assessment.growthProfile.weaknesses,
                growthFocus: assessment.growthProfile.growthFocus,
                growthFocusDetail: assessment.growthProfile.growthFocusDetail,
                actionSuggestion: assessment.growthProfile.actionSuggestion,
              }
            : null,
          answers: assessment.answerRecords.map((a) => ({
            questionId: a.questionId,
            questionOrder: a.question.order,
            questionContent: a.question.content,
            stage: a.question.stage,
            answer: a.answer,
            score: a.score,
            isReverseScored: a.question.isReverseScored,
            module: a.question.module.name,
            dimension: a.question.module.dimension.name,
            system: a.question.module.dimension.system.name,
          })),
          payment: {
            status: assessment.payment.status,
            amount: assessment.payment.amount,
            confirmedAt: assessment.payment.confirmedAt,
          },
        });
      }

      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: reportDeliveryId(handbook.id, handbook.version) },
      select: { status: true, error: true, sentAt: true, to: true },
    });
    const job = handbook.status === "ANALYZING" ? await getReportJob(handbook.assessmentId) : null;
    const jobIssue = job?.state === "FAILED" ? "任务失败，请核查生成记录后重试"
      : job && isStaleReportJob(job) ? "任务超过 20 分钟未完成，请核查生成记录后重试" : null;
    return NextResponse.json({
      delivery,
      jobIssue,
      handbook: {
        id: handbook.id,
        assessmentId: handbook.assessmentId,
        status: handbook.status,
        content: handbook.content,
        contentHtml: cleanReportHtml(handbook.contentHtml || handbook.aiRawOutput),
        aiRawOutput: null,
        reviewedBy: handbook.reviewedBy,
        reviewNotes: handbook.reviewNotes,
        reviewedAt: handbook.reviewedAt,
        sentAt: handbook.sentAt,
        sentTo: handbook.sentTo,
        version: handbook.version,
        createdAt: handbook.createdAt,
      },
      user: {
        email: handbook.user.email,
        phone: handbook.user.phone,
        emailVerified: handbook.user.emailVerified,
      },
      assessment: {
        studentName: handbook.assessment.studentName,
        parentName: handbook.assessment.parentName,
        grade: handbook.assessment.grade,
        studentGender: handbook.assessment.studentGender,
        interests: handbook.assessment.interests,
        status: handbook.assessment.status,
      },
      profile: handbook.assessment.growthProfile
        ? {
            learningMode: handbook.assessment.growthProfile.learningMode,
            learningModeName: handbook.assessment.growthProfile.learningModeName,
            learningModeEmoji: handbook.assessment.growthProfile.learningModeEmoji,
            systemScores: handbook.assessment.growthProfile.systemScores,
            dimensionScores: handbook.assessment.growthProfile.dimensionScores,
            moduleScores: handbook.assessment.growthProfile.moduleScores,
            strengths: handbook.assessment.growthProfile.strengths,
            weaknesses: handbook.assessment.growthProfile.weaknesses,
            growthFocus: handbook.assessment.growthProfile.growthFocus,
            growthFocusDetail: handbook.assessment.growthProfile.growthFocusDetail,
            actionSuggestion: handbook.assessment.growthProfile.actionSuggestion,
          }
        : null,
      answers: handbook.assessment.answerRecords.map((a) => ({
        questionId: a.questionId,
        questionOrder: a.question.order,
        questionContent: a.question.content,
        stage: a.question.stage,
        answer: a.answer,
        score: a.score,
        isReverseScored: a.question.isReverseScored,
        module: a.question.module.name,
        dimension: a.question.module.dimension.name,
        system: a.question.module.dimension.system.name,
      })),
      payment: handbook.assessment.payment
        ? {
            status: handbook.assessment.payment.status,
            amount: handbook.assessment.payment.amount,
            confirmedAt: handbook.assessment.payment.confirmedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Report detail error:", error);
    return NextResponse.json({ error: "获取报告详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/reports/[id]
 * Update report content / status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = (await getAdminSession())?.id;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, contentHtml, status, reviewNotes } = body;
    if (status !== undefined && !["ANALYZING", "REVIEWING", "NEEDS_MANUAL_REVIEW"].includes(status)) {
      return NextResponse.json({ error: "发送状态只能由邮件投递结果更新" }, { status: 400 });
    }
    const current = await prisma.growthHandbook.findUnique({ where: { id }, select: { status: true } });
    if (!current) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    if (["SENDING", "SENT"].includes(current.status) && (status !== undefined || content !== undefined || contentHtml !== undefined)) {
      return NextResponse.json({ error: "发送中的报告不能直接修改，请核实投递记录" }, { status: 409 });
    }

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (contentHtml !== undefined) updateData.contentHtml = contentHtml;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "REVIEWING") {
        updateData.reviewedBy = adminId;
        updateData.reviewedAt = new Date();
      }
    }
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;

    const handbook = await prisma.growthHandbook.update({
      where: { id },
      data: updateData,
    });

    // Log
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    await prisma.operationLog.create({
      data: {
        adminId,
        adminName: admin?.username || "unknown",
        action: `update_report_${status || "content"}`,
        target: id,
      },
    });

    return NextResponse.json({ success: true, handbook });
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

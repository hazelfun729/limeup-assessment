import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/reports/[id]
 * Full report detail for review page (three-zone layout)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    // Try lookup by handbook.id first, then by assessmentId
    let handbook = await prisma.growthHandbook.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true } },
        assessment: {
          include: {
            answerRecords: {
              include: {
                question: {
                  include: { module: { include: { dimension: { include: { system: true } } } } },
                },
              },
              orderBy: { answeredAt: "asc" },
            },
            growthProfile: true,
            payment: true,
          },
        },
      },
    });

    // If not found by handbook id, try by assessmentId
    if (!handbook) {
      handbook = await prisma.growthHandbook.findUnique({
        where: { assessmentId: id },
        include: {
          user: { select: { email: true, phone: true } },
          assessment: {
            include: {
              answerRecords: {
                include: {
                  question: {
                    include: { module: { include: { dimension: { include: { system: true } } } } },
                  },
                },
                orderBy: { answeredAt: "asc" },
              },
              growthProfile: true,
              payment: true,
            },
          },
        },
      });
    }

    // If still no handbook, check for PENDING payment (AWAITING_PAYMENT state)
    if (!handbook) {
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          user: { select: { email: true, phone: true } },
          answerRecords: {
            include: {
              question: {
                include: { module: { include: { dimension: { include: { system: true } } } } },
              },
            },
            orderBy: { answeredAt: "asc" },
          },
          growthProfile: true,
          payment: true,
        },
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

    return NextResponse.json({
      handbook: {
        id: handbook.id,
        assessmentId: handbook.assessmentId,
        status: handbook.status,
        content: handbook.content,
        contentHtml: handbook.contentHtml,
        aiRawOutput: handbook.aiRawOutput,
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
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, contentHtml, status, reviewNotes, sentTo } = body;

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (contentHtml !== undefined) updateData.contentHtml = contentHtml;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "REVIEWING") {
        updateData.reviewedBy = adminId;
        updateData.reviewedAt = new Date();
      }
      if (status === "SENT") {
        updateData.sentAt = new Date();
        updateData.sentTo = sentTo || null;
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

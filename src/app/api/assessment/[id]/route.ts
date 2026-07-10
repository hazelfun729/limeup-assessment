import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assessment/[id]
 * Get assessment details, saved answers, and question text
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        answerRecords: {
          include: { question: true },
          orderBy: { answeredAt: "asc" },
        },
        questionVersion: {
          include: {
            questions: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              select: {
                id: true,
                order: true,
                stage: true,
                content: true,
                isReverseScored: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "测评不存在" },
        { status: 404 }
      );
    }

    // Build answers map: { questionOrder: answerValue }
    const answersMap: Record<number, string> = {};
    for (const answer of assessment.answerRecords) {
      answersMap[answer.question.order] = answer.answer;
    }

    // Build questions list for frontend display
    const questions = assessment.questionVersion.questions.map((q) => ({
      order: q.order,
      stage: q.stage,
      content: q.content,
    }));

    return NextResponse.json({
      id: assessment.id,
      status: assessment.status,
      currentQuestion: assessment.currentQuestion,
      answers: answersMap,
      questions,
      studentName: assessment.studentName,
      parentName: assessment.parentName,
      studentGender: assessment.studentGender,
      grade: assessment.grade,
    });
  } catch (error) {
    console.error("Failed to get assessment:", error);
    return NextResponse.json(
      { error: "获取测评信息失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assessment/[id]
 * Save assessment answers (batch upsert)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { answers, currentQuestion } = body as {
      answers: Record<string, string>;
      currentQuestion?: number;
    };

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questionVersion: {
          include: {
            questions: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "测评不存在" },
        { status: 404 }
      );
    }

    const questionMap = new Map<
      number,
      {
        id: string;
        scoreValues: Record<string, number>;
        isReverseScored: boolean;
      }
    >();
    for (const q of assessment.questionVersion.questions) {
      questionMap.set(q.order, {
        id: q.id,
        scoreValues: q.scoreValues as Record<string, number>,
        isReverseScored: q.isReverseScored,
      });
    }

    const upsertOps = Object.entries(answers).map(([orderStr, answerValue]) => {
      const order = parseInt(orderStr, 10);
      const question = questionMap.get(order);
      if (!question) return null;

      const score = question.scoreValues[answerValue] ?? null;

      return prisma.assessmentAnswer.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: id,
            questionId: question.id,
          },
        },
        create: {
          assessmentId: id,
          questionId: question.id,
          answer: answerValue,
          score,
        },
        update: {
          answer: answerValue,
          score,
        },
      });
    });

    await Promise.all(upsertOps.filter(Boolean));

    if (currentQuestion !== undefined) {
      await prisma.assessment.update({
        where: { id },
        data: { currentQuestion },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save answers:", error);
    return NextResponse.json(
      { error: "保存答案失败" },
      { status: 500 }
    );
  }
}

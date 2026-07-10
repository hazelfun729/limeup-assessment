import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/assessment/[id]/answer
 * Submit a single answer or batch of answers
 * Single: { questionId: string, answer: string, value?: number }
 * Batch:  { answers: { [order]: answerValue } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }

    const questionMap = new Map<
      string,
      { id: string; scoreValues: Record<string, number> }
    >();
    const orderByNum = new Map<
      number,
      { id: string; scoreValues: Record<string, number> }
    >();
    for (const q of assessment.questionVersion.questions) {
      const entry = {
        id: q.id,
        scoreValues: q.scoreValues as Record<string, number>,
      };
      questionMap.set(q.id, entry);
      orderByNum.set(q.order, entry);
    }

    // Single answer mode
    if (body.questionId && body.answer) {
      const question = questionMap.get(body.questionId);
      if (!question) {
        return NextResponse.json({ error: "题目不存在" }, { status: 404 });
      }

      const score = question.scoreValues[body.answer] ?? null;

      await prisma.assessmentAnswer.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: id,
            questionId: question.id,
          },
        },
        create: {
          assessmentId: id,
          questionId: question.id,
          answer: body.answer,
          score,
        },
        update: {
          answer: body.answer,
          score,
        },
      });

      return NextResponse.json({ success: true, score });
    }

    // Batch answer mode: { answers: { "1": "VERY_MATCH", "2": "MATCH", ... } }
    if (body.answers && typeof body.answers === "object") {
      const ops = Object.entries(body.answers).map(
        ([key, answerValue]: [string, unknown]) => {
          const order = parseInt(key, 10);
          const question = orderByNum.get(order);
          if (!question || typeof answerValue !== "string") return null;

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
        }
      );

      await Promise.all(ops.filter(Boolean));

      if (body.currentQuestion !== undefined) {
        await prisma.assessment.update({
          where: { id },
          data: { currentQuestion: body.currentQuestion },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "请提供 questionId+answer 或 answers 对象" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Answer submission error:", error);
    return NextResponse.json(
      { error: "保存答案失败" },
      { status: 500 }
    );
  }
}

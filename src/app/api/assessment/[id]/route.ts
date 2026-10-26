import { assessmentAccess } from "@/lib/security/assessment";
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
    const denied = await assessmentAccess(id);
    if (denied) return denied;

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
      savedAt: Math.max(assessment.startedAt.getTime(), ...assessment.answerRecords.map(a => a.answeredAt.getTime())),
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

/** Save validated answers atomically; completed assessments are immutable. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const denied = await assessmentAccess(id);
    if (denied) return denied;
    const body = await request.json();
    const { answers, currentQuestion } = body;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return NextResponse.json({ error: "答案格式不正确" }, { status: 400 });
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { questionVersion: { include: { questions: { where: { isActive: true } } } } } });
    if (!assessment || assessment.status !== "IN_PROGRESS") return NextResponse.json({ error: "已完成的测评不能修改" }, { status: 409 });
    const questions = assessment.questionVersion.questions;
    const map = new Map(questions.map(q => [q.order, q]));
    if (!Number.isInteger(currentQuestion) || currentQuestion < 1 || currentQuestion > questions.length) return NextResponse.json({ error: "测评进度不正确" }, { status: 400 });
    const entries = Object.entries(answers);
    if (entries.some(([order, answer]) => !/^\d+$/.test(order) || !map.has(Number(order)) || typeof answer !== "string" || !Object.hasOwn(map.get(Number(order))!.scoreValues as object, answer))) return NextResponse.json({ error: "答案包含无效选项" }, { status: 400 });
    await prisma.$transaction(async tx => {
      const locked = await tx.assessment.updateMany({ where: { id, status: "IN_PROGRESS" }, data: { currentQuestion } });
      if (!locked.count) throw new Error("Assessment completed");
      const records = entries.map(([order, value]) => {
        const q = map.get(Number(order))!;
        return { assessmentId: id, questionId: q.id, answer: value as string, score: (q.scoreValues as Record<string, number>)[value as string] };
      });
      await tx.assessmentAnswer.deleteMany({ where: { assessmentId: id, questionId: { in: records.map(r => r.questionId) } } });
      await tx.assessmentAnswer.createMany({ data: records });
    }, { timeout: 20000 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Answer save failed", error);
    return NextResponse.json({ error: "保存失败，请重试" }, { status: 400 });
  }
}

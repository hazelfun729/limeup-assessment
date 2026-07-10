import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyLearningType, determineGrowthFocus } from "@/lib/scoring/types";
import { getScoreLevel } from "@/lib/assessment-constants";

/**
 * POST /api/assessment/test
 * Test mode: auto-generate assessment with preset answers
 * Body: {
 *   preset?: "high"|"medium"|"low"|"random",
 *   skipProfile?: boolean,   // skip GrowthProfile creation (for frontend skip flow)
 *   studentName?, grade?, studentGender?
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const preset = (body.preset as string) || "random";
    const skipProfile = body.skipProfile === true;

    // Get active version
    const version = await prisma.questionVersion.findFirst({
      where: { isActive: true },
    });
    if (!version) {
      return NextResponse.json({ error: "题目版本不存在" }, { status: 500 });
    }

    // Get all active questions with module hierarchy
    const questions = await prisma.question.findMany({
      where: { isActive: true, versionId: version.id },
      orderBy: { order: "asc" },
      include: {
        module: {
          include: {
            dimension: { include: { system: true } },
          },
        },
      },
    });

    if (questions.length === 0) {
      return NextResponse.json({ error: "没有活跃题目" }, { status: 500 });
    }

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        questionVersionId: version.id,
        status: "COMPLETED",
        currentQuestion: questions.length + 1,
        startedAt: new Date(),
        completedAt: new Date(),
        source: "test",
        studentName: body.studentName || "测试学生",
        parentName: body.parentName || null,
        studentGender: body.studentGender || "男",
        grade: body.grade || "6",
        phone: body.phone || null,
        interests: body.interests || null,
      },
    });

    // Generate answers
    const answerData = questions.map((q) => {
      const sv = q.scoreValues as Record<string, number>;
      let answer: string;

      if (preset === "high") {
        answer = q.isReverseScored
          ? ["RARELY", "RARELY", "SOMETIMES"][Math.floor(Math.random() * 3)]
          : ["ALWAYS", "ALWAYS", "OFTEN"][Math.floor(Math.random() * 3)];
      } else if (preset === "low") {
        answer = q.isReverseScored
          ? ["ALWAYS", "ALWAYS", "OFTEN"][Math.floor(Math.random() * 3)]
          : ["RARELY", "RARELY", "UNKNOWN"][Math.floor(Math.random() * 3)];
      } else if (preset === "medium") {
        answer = ["OFTEN", "SOMETIMES"][Math.floor(Math.random() * 2)];
      } else {
        const opts = ["ALWAYS", "OFTEN", "SOMETIMES", "RARELY", "UNKNOWN"];
        answer = opts[Math.floor(Math.random() * opts.length)];
      }

      return {
        assessmentId: assessment.id,
        questionId: q.id,
        answer,
        score: sv[answer] ?? 0,
      };
    });

    // Batch insert answers
    await prisma.assessmentAnswer.createMany({ data: answerData });

    // Skip mode: return assessmentId only, profile will be generated on demand
    if (skipProfile) {
      return NextResponse.json({
        success: true,
        assessmentId: assessment.id,
        preset,
        registerUrl: `/register?assessmentId=${assessment.id}`,
      });
    }

    // Compute scores
    const answerMap = new Map(answerData.map((a) => [a.questionId, a]));
    const moduleScores: Record<string, number> = {};
    const dimAccum: Record<string, { sum: number; count: number }> = {};
    const sysAccum: Record<string, { sum: number; count: number }> = {};
    const moduleInfo: Record<string, { dimCode: string; sysCode: string }> = {};

    for (const q of questions) {
      const a = answerMap.get(q.id);
      if (!a || a.score === 0) continue;

      const mCode = q.module.code;
      if (!moduleScores[mCode]) moduleScores[mCode] = 0;
      if (!moduleInfo[mCode]) {
        moduleInfo[mCode] = { dimCode: q.module.dimension.code, sysCode: q.module.dimension.system.code };
      }

      // Accumulate per module (will average later)
      const key = `${mCode}_${q.id}`;
      moduleScores[mCode] = (moduleScores[mCode] || 0) + a.score;
    }

    // Average per module
    const moduleCount: Record<string, number> = {};
    for (const q of questions) {
      const a = answerMap.get(q.id);
      if (!a || a.score === 0) continue;
      moduleCount[q.module.code] = (moduleCount[q.module.code] || 0) + 1;
    }
    for (const [code, total] of Object.entries(moduleScores)) {
      moduleScores[code] = Math.round(total / (moduleCount[code] || 1));
    }

    // Dimension and system scores
    const dimScores: Record<string, number> = {};
    const sysScores: Record<string, number> = {};
    for (const [mCode, score] of Object.entries(moduleScores)) {
      const info = moduleInfo[mCode];
      if (!info) continue;
      dimAccum[info.dimCode] = dimAccum[info.dimCode] || { sum: 0, count: 0 };
      dimAccum[info.dimCode].sum += score;
      dimAccum[info.dimCode].count += 1;
      sysAccum[info.sysCode] = sysAccum[info.sysCode] || { sum: 0, count: 0 };
      sysAccum[info.sysCode].sum += score;
      sysAccum[info.sysCode].count += 1;
    }
    for (const [k, v] of Object.entries(dimAccum)) {
      dimScores[k] = Math.round(v.sum / v.count);
    }
    for (const [k, v] of Object.entries(sysAccum)) {
      sysScores[k] = Math.round(v.sum / v.count);
    }

    // Animal type classification using exact lookup table
    const D = sysScores["D"] || 0;
    const A = sysScores["A"] || 0;
    const P = sysScores["P"] || 0;
    const dLevel = getScoreLevel(D);
    const aLevel = getScoreLevel(A);
    const pLevel = getScoreLevel(P);
    const learningType = classifyLearningType(dLevel, aLevel, pLevel);
    const mode = learningType.name;
    const emoji = learningType.emoji;
    const { focus, detail } = determineGrowthFocus(learningType, {
      D: { score: D, level: dLevel },
      A: { score: A, level: aLevel },
      P: { score: P, level: pLevel },
    });

    // Strengths/weaknesses
    const sorted = Object.entries(moduleScores).sort(([, a], [, b]) => b - a);
    const strengths = sorted.slice(0, 3).map(([code, score]) => ({ code, score }));
    const weaknesses = sorted.slice(-3).reverse().map(([code, score]) => ({ code, score }));

    // Create profile (userId = assessment.id for test, no real user)
    await prisma.growthProfile.create({
      data: {
        userId: assessment.userId || 'test_mode_user',
        assessmentId: assessment.id,
        learningMode: mode,
        learningModeName: mode,
        learningModeEmoji: emoji,
        systemScores: sysScores,
        dimensionScores: dimScores,
        moduleScores,
        strengths,
        weaknesses,
        growthFocus: focus,
        growthFocusDetail: detail,
        actionSuggestion: "每天花15分钟针对薄弱模块进行专项练习",
        summary: `${body.studentName || "学生"}的学习模式为${mode}${emoji}，D=${D} A=${A} P=${P}`,
      },
    });

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      preset,
      learningMode: mode,
      emoji,
      systemScores: { D, A, P },
      profileUrl: `/profile/${assessment.id}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Test mode error:", msg);
    return NextResponse.json({ error: `测试模式创建失败: ${msg}` }, { status: 500 });
  }
}

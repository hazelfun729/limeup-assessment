/**
 * Growth Profile Generator
 *
 * Takes assessment answers → calculates scores → classifies type → generates profile
 */

import { prisma } from "@/lib/prisma";
import {
  calculateScores,
  calculateAnswerScore,
  SYSTEMS,
  DIMENSIONS,
  MODULES,
  type ScoringResult,
} from "./engine";
import { getScoreLevel } from "@/lib/assessment-constants";
import {
  classifyLearningType,
  determineGrowthFocus,
  generateActionSuggestion,
  type LearningType,
} from "./types";

interface ProfileInput {
  assessmentId: string;
}

export interface GeneratedProfile {
  learningMode: string;
  learningModeName: string;
  learningModeEmoji: string;
  summary: string;
  systemScores: Record<string, { score: number; level: string }>;
  dimensionScores: Record<string, { score: number; level: string; name: string }>;
  moduleScores: Record<string, { score: number; level: string; name: string }>;
  growthFocus: string;
  growthFocusDetail: string;
  actionSuggestion: string;
  learningType: LearningType;
}

/**
 * Generate a complete growth profile for an assessment
 */
export async function generateProfile(
  input: ProfileInput
): Promise<GeneratedProfile | null> {
  const { assessmentId } = input;

  // 1. Fetch assessment answers
  const answers = await prisma.assessmentAnswer.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: {
          order: true,
          isReverseScored: true,
        },
      },
    },
  });

  if (answers.length === 0) {
    return null;
  }

  // 2. Calculate individual answer scores and prepare for engine
  const answerRecords = answers.map((a) => ({
    questionOrder: a.question.order,
    answer: a.answer,
    score: calculateAnswerScore(a.answer, a.question.isReverseScored),
  }));

  // 3. Run scoring engine
  const scoring = calculateScores(answerRecords);

  // 4. Classify learning type
  const learningType = classifyLearningType(
    scoring.dLevel,
    scoring.aLevel,
    scoring.pLevel
  );

  // 5. Determine growth focus
  const { focus, detail } = determineGrowthFocus(
    learningType,
    scoring.systemScores
  );

  // 6. Generate action suggestion
  const actionSuggestion = generateActionSuggestion(learningType);

  // 7. Build formatted scores with names
  const systemScoresFormatted: Record<
    string,
    { score: number; level: string }
  > = {};
  for (const sys of SYSTEMS) {
    const s = scoring.systemScores[sys.code];
    systemScoresFormatted[sys.nameEn] = {
      score: s.score,
      level: s.level,
    };
  }

  const dimensionScoresFormatted: Record<
    string,
    { score: number; level: string; name: string }
  > = {};
  for (const dim of DIMENSIONS) {
    const score = scoring.dimensionScores[dim.code] ?? 0;
    dimensionScoresFormatted[dim.code] = {
      score,
      level: getScoreLevel(score),
      name: dim.name,
    };
  }

  const moduleScoresFormatted: Record<
    string,
    { score: number; level: string; name: string }
  > = {};
  for (const mod of MODULES) {
    const score = scoring.moduleScores[mod.code] ?? 0;
    moduleScoresFormatted[mod.code] = {
      score,
      level: getScoreLevel(score),
      name: mod.name,
    };
  }

  // 8. Generate summary
  const summary = generateSummary(learningType, scoring);

  return {
    learningMode: learningType.code,
    learningModeName: learningType.name,
    learningModeEmoji: learningType.emoji,
    summary,
    systemScores: systemScoresFormatted,
    dimensionScores: dimensionScoresFormatted,
    moduleScores: moduleScoresFormatted,
    growthFocus: focus,
    growthFocusDetail: detail,
    actionSuggestion,
    learningType,
  };
}

/**
 * Save generated profile to database
 */
export async function saveProfile(
  assessmentId: string,
  userId: string,
  profile: GeneratedProfile
) {
  // Ensure proper JSON serialization for Prisma
  const sysJson = JSON.parse(JSON.stringify(profile.systemScores));
  const dimJson = JSON.parse(JSON.stringify(profile.dimensionScores));
  const modJson = JSON.parse(JSON.stringify(profile.moduleScores));

  await prisma.growthProfile.upsert({
    where: { assessmentId },
    create: {
      userId,
      assessmentId,
      learningMode: profile.learningMode,
      learningModeName: profile.learningModeName,
      learningModeEmoji: profile.learningModeEmoji,
      systemScores: sysJson,
      dimensionScores: dimJson,
      moduleScores: modJson,
      growthFocus: profile.growthFocus,
      growthFocusDetail: profile.growthFocusDetail,
      actionSuggestion: profile.actionSuggestion,
      summary: profile.summary,
    },
    update: {
      learningMode: profile.learningMode,
      learningModeName: profile.learningModeName,
      learningModeEmoji: profile.learningModeEmoji,
      systemScores: sysJson,
      dimensionScores: dimJson,
      moduleScores: modJson,
      growthFocus: profile.growthFocus,
      growthFocusDetail: profile.growthFocusDetail,
      actionSuggestion: profile.actionSuggestion,
      summary: profile.summary,
    },
  });
}

// ==========================================
// Helpers
// ==========================================

function generateSummary(
  type: LearningType,
  scoring: ScoringResult
): string {
  const dScore = scoring.systemScores["D"]?.score ?? 0;
  const aScore = scoring.systemScores["A"]?.score ?? 0;
  const pScore = scoring.systemScores["P"]?.score ?? 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (dScore > 72) strengths.push("充沛的学习动力");
  else if (dScore <= 50) weaknesses.push("学习动力不足");

  if (aScore > 72) strengths.push("高效的学习方法");
  else if (aScore <= 50) weaknesses.push("学习方法有待提升");

  if (pScore > 72) strengths.push("出色的学习毅力");
  else if (pScore <= 50) weaknesses.push("持续学习的毅力需要加强");

  if (strengths.length > 0 && weaknesses.length > 0) {
    return `孩子在${strengths.join("和")}方面表现出色，但在${weaknesses.join("和")}方面还有成长空间。${type.coreTraits}`;
  }
  if (strengths.length > 0) {
    return `孩子在${strengths.join("、")}方面表现出色。${type.coreTraits}`;
  }
  if (weaknesses.length > 0) {
    return `孩子当前在${weaknesses.join("、")}方面需要更多支持。${type.coreTraits}`;
  }
  return type.coreTraits;
}

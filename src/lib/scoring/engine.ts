/**
 * Growth Engine — 3-9-27 Scoring System
 *
 * Flow: Answers → Module scores → Dimension scores → System scores → Learning type
 *
 * Scoring:
 *   Normal:  总是=100, 经常=90, 偶尔=30, 极少=0, 不了解=0(不计分)
 *   Reverse: 总是=0, 经常=30, 偶尔=90, 极少=100, 不了解=0(不计分)
 *
 * Thresholds: 弱≤50, 50<中≤72, 72<强≤100
 */

import { getScoreLevel, type ScoreLevel } from "@/lib/assessment-constants";

// ==========================================
// 3-9-27 Model Hierarchy
// ==========================================

export interface ModuleDef {
  code: string;
  name: string;
  dimensionCode: string;
}

export interface DimensionDef {
  code: string;
  name: string;
  systemCode: string;
  modules: string[]; // module codes
}

export interface SystemDef {
  code: string;
  name: string;
  nameEn: string;
  dimensions: string[]; // dimension codes
}

// 3 Systems
export const SYSTEMS: SystemDef[] = [
  { code: "D", name: "学习动力", nameEn: "motivation", dimensions: ["DR_INNER", "DR_START", "DR_CONF"] },
  { code: "A", name: "学习能力", nameEn: "ability", dimensions: ["AB_PLAN", "AB_THINK", "AB_REFLECT"] },
  { code: "P", name: "学习毅力", nameEn: "perseverance", dimensions: ["PE_DURABLE", "PE_EMOTION", "PE_RESILIENCE"] },
];

// 9 Dimensions
export const DIMENSIONS: DimensionDef[] = [
  // 学习动力
  { code: "DR_INNER", name: "内驱力", systemCode: "D", modules: ["M_AUTONOMY", "M_MEANING", "M_INTEREST"] },
  { code: "DR_CONF", name: "自信心", systemCode: "D", modules: ["M_WORTH", "M_EFFICACY", "M_BELONGING"] },
  { code: "DR_START", name: "行动启动器", systemCode: "D", modules: ["M_AWARENESS", "M_SAFETY", "M_LAUNCH"] },
  // 学习能力
  { code: "AB_PLAN", name: "规划力", systemCode: "A", modules: ["M_GOAL", "M_STRATEGY", "M_TIME"] },
  { code: "AB_THINK", name: "思维力", systemCode: "A", modules: ["M_MEMORY", "M_ANALYSIS", "M_TRANSFER"] },
  { code: "AB_REFLECT", name: "反思力", systemCode: "A", modules: ["M_MONITOR", "M_ROOTCAUSE", "M_PROCESS"] },
  // 学习毅力
  { code: "PE_DURABLE", name: "学习耐久力", systemCode: "P", modules: ["M_BRAIN", "M_FOCUS", "M_SELFBOOST"] },
  { code: "PE_EMOTION", name: "情绪调节力", systemCode: "P", modules: ["M_EMOTION_ID", "M_NEG_SOOthe", "M_POS_SPARK"] },
  { code: "PE_RESILIENCE", name: "抗挫力", systemCode: "P", modules: ["M_GROWTH", "M_FLEXIBILITY", "M_TOUGHNESS"] },
];

// 27 Modules
export const MODULES: ModuleDef[] = [
  // 内驱力
  { code: "M_AUTONOMY", name: "自主感", dimensionCode: "DR_INNER" },
  { code: "M_MEANING", name: "意义感", dimensionCode: "DR_INNER" },
  { code: "M_INTEREST", name: "兴趣驱动", dimensionCode: "DR_INNER" },
  // 自信心
  { code: "M_WORTH", name: "价值感", dimensionCode: "DR_CONF" },
  { code: "M_EFFICACY", name: "效能感", dimensionCode: "DR_CONF" },
  { code: "M_BELONGING", name: "归属感", dimensionCode: "DR_CONF" },
  // 行动启动器
  { code: "M_AWARENESS", name: "自我觉察", dimensionCode: "DR_START" },
  { code: "M_SAFETY", name: "安全感", dimensionCode: "DR_START" },
  { code: "M_LAUNCH", name: "启动策略", dimensionCode: "DR_START" },
  // 规划力
  { code: "M_GOAL", name: "目标管理", dimensionCode: "AB_PLAN" },
  { code: "M_STRATEGY", name: "策略计划", dimensionCode: "AB_PLAN" },
  { code: "M_TIME", name: "时间管理", dimensionCode: "AB_PLAN" },
  // 思维力
  { code: "M_MEMORY", name: "理解和记忆", dimensionCode: "AB_THINK" },
  { code: "M_ANALYSIS", name: "思考和分析", dimensionCode: "AB_THINK" },
  { code: "M_TRANSFER", name: "应用和迁移", dimensionCode: "AB_THINK" },
  // 反思力
  { code: "M_MONITOR", name: "监控评估能力", dimensionCode: "AB_REFLECT" },
  { code: "M_ROOTCAUSE", name: "深度归因能力", dimensionCode: "AB_REFLECT" },
  { code: "M_PROCESS", name: "程序定制能力", dimensionCode: "AB_REFLECT" },
  // 学习耐久力
  { code: "M_BRAIN", name: "大脑健康有活力", dimensionCode: "PE_DURABLE" },
  { code: "M_FOCUS", name: "专注与自制力", dimensionCode: "PE_DURABLE" },
  { code: "M_SELFBOOST", name: "自我激励的能力", dimensionCode: "PE_DURABLE" },
  // 情绪调节力
  { code: "M_EMOTION_ID", name: "情绪识别", dimensionCode: "PE_EMOTION" },
  { code: "M_NEG_SOOthe", name: "负面情绪安抚", dimensionCode: "PE_EMOTION" },
  { code: "M_POS_SPARK", name: "正面情绪激发", dimensionCode: "PE_EMOTION" },
  // 抗挫力
  { code: "M_GROWTH", name: "成长型思维", dimensionCode: "PE_RESILIENCE" },
  { code: "M_FLEXIBILITY", name: "心理灵活性", dimensionCode: "PE_RESILIENCE" },
  { code: "M_TOUGHNESS", name: "韧性", dimensionCode: "PE_RESILIENCE" },
];

// Build lookup maps
const moduleMap = new Map(MODULES.map((m) => [m.code, m]));
const dimMap = new Map(DIMENSIONS.map((d) => [d.code, d]));
const sysMap = new Map(SYSTEMS.map((s) => [s.code, s]));

// ==========================================
// Question → Module Mapping (from XLSX)
// questionOrder = 1-indexed question number (1-66)
// ==========================================

// Maps question order (1-66) to module code
const QUESTION_MODULE_MAP: Record<number, string> = {
  // 内驱力 → 自主感: Q1-Q2
  1: "M_AUTONOMY", 2: "M_AUTONOMY",
  // 内驱力 → 意义感: Q3-Q4
  3: "M_MEANING", 4: "M_MEANING",
  // 内驱力 → 兴趣驱动: Q5-Q8
  5: "M_INTEREST", 6: "M_INTEREST", 7: "M_INTEREST", 8: "M_INTEREST",
  // 自信心 → 价值感: Q9-Q10
  9: "M_WORTH", 10: "M_WORTH",
  // 自信心 → 效能感: Q11-Q13
  11: "M_EFFICACY", 12: "M_EFFICACY", 13: "M_EFFICACY",
  // 自信心 → 归属感: Q14-Q15
  14: "M_BELONGING", 15: "M_BELONGING",
  // 行动启动器 → 自我觉察: Q16
  16: "M_AWARENESS",
  // 行动启动器 → 安全感: Q17-Q19
  17: "M_SAFETY", 18: "M_SAFETY", 19: "M_SAFETY",
  // 行动启动器 → 启动策略: Q20
  20: "M_LAUNCH",
  // (Q21-Q22 belong to 学习动力 system total, but map to specific modules below)
  21: "M_GOAL", 22: "M_GOAL",
  // 规划力 → 目标管理: Q21-Q23
  23: "M_GOAL",
  // 规划力 → 策略计划: Q24-Q25
  24: "M_STRATEGY", 25: "M_STRATEGY",
  // 规划力 → 时间管理: Q26-Q27
  26: "M_TIME", 27: "M_TIME",
  // 思维力 → 理解和记忆: Q28-Q29
  28: "M_MEMORY", 29: "M_MEMORY",
  // 思维力 → 思考和分析: Q30-Q32
  30: "M_ANALYSIS", 31: "M_ANALYSIS", 32: "M_ANALYSIS",
  // 思维力 → 应用和迁移: Q33-Q36
  33: "M_TRANSFER", 34: "M_TRANSFER", 35: "M_TRANSFER", 36: "M_TRANSFER",
  // 反思力 → 监控评估能力: Q37-Q39
  37: "M_MONITOR", 38: "M_MONITOR", 39: "M_MONITOR",
  // 反思力 → 深度归因能力: Q40-Q41
  40: "M_ROOTCAUSE", 41: "M_ROOTCAUSE",
  // 反思力 → 程序定制能力: Q42-Q44
  42: "M_PROCESS", 43: "M_PROCESS", 44: "M_PROCESS",
  // 学习耐久力 → 大脑健康有活力: Q45-Q48
  45: "M_BRAIN", 46: "M_BRAIN", 47: "M_BRAIN", 48: "M_BRAIN",
  // 学习耐久力 → 专注与自制力: Q49-Q53
  49: "M_FOCUS", 50: "M_FOCUS", 51: "M_FOCUS", 52: "M_FOCUS", 53: "M_FOCUS",
  // 学习耐久力 → 自我激励的能力: Q54
  54: "M_SELFBOOST",
  // 情绪调节力 → 情绪识别: Q55-Q56
  55: "M_EMOTION_ID", 56: "M_EMOTION_ID",
  // 情绪调节力 → 负面情绪安抚: Q57-Q58
  57: "M_NEG_SOOthe", 58: "M_NEG_SOOthe",
  // 情绪调节力 → 正面情绪激发: Q59-Q60
  59: "M_POS_SPARK", 60: "M_POS_SPARK",
  // 抗挫力 → 成长型思维: Q61-Q63
  61: "M_GROWTH", 62: "M_GROWTH", 63: "M_GROWTH",
  // 抗挫力 → 心理灵活性: Q64
  64: "M_FLEXIBILITY",
  // 抗挫力 → 韧性: Q65-Q66
  65: "M_TOUGHNESS", 66: "M_TOUGHNESS",
};

// ==========================================
// Answer Scoring
// ==========================================

interface AnswerRecord {
  questionOrder: number; // 1-66
  answer: string;      // ALWAYS | OFTEN | SOMETIMES | RARELY | UNKNOWN
  score: number;       // already calculated score for this answer
}

/**
 * Calculate the score for a single answer
 */
export function calculateAnswerScore(
  answer: string,
  isReverseScored: boolean
): number {
  const normalScores: Record<string, number> = {
    ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0,
  };
  const reverseScores: Record<string, number> = {
    ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0,
  };
  const scores = isReverseScored ? reverseScores : normalScores;
  return scores[answer] ?? 0;
}

// ==========================================
// Core Scoring Engine
// ==========================================

export interface ScoringResult {
  moduleScores: Record<string, number>;   // module code → score (0-100)
  dimensionScores: Record<string, number>; // dimension code → score (0-100)
  systemScores: Record<string, { score: number; level: ScoreLevel }>;
  dLevel: ScoreLevel;
  aLevel: ScoreLevel;
  pLevel: ScoreLevel;
}

/**
 * Calculate all scores from answered questions
 */
export function calculateScores(answers: AnswerRecord[]): ScoringResult {
  // 1. Group answer scores by module
  const moduleAnswers = new Map<string, number[]>();
  for (const m of MODULES) {
    moduleAnswers.set(m.code, []);
  }

  for (const a of answers) {
    const moduleCode = QUESTION_MODULE_MAP[a.questionOrder];
    if (moduleCode) {
      moduleAnswers.get(moduleCode)!.push(a.score);
    }
  }

  // 2. Calculate module scores (average of answered questions)
  const moduleScores: Record<string, number> = {};
  for (const [code, scores] of moduleAnswers) {
    if (scores.length > 0) {
      moduleScores[code] = Math.round(
        scores.reduce((sum, s) => sum + s, 0) / scores.length
      );
    } else {
      moduleScores[code] = 0;
    }
  }

  // 3. Calculate dimension scores (average of module scores)
  const dimensionScores: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    const modScores = dim.modules
      .map((m) => moduleScores[m])
      .filter((s) => s !== undefined);
    if (modScores.length > 0) {
      dimensionScores[dim.code] = Math.round(
        modScores.reduce((sum, s) => sum + s, 0) / modScores.length
      );
    } else {
      dimensionScores[dim.code] = 0;
    }
  }

  // 4. Calculate system scores (average of dimension scores)
  const systemScores: Record<string, { score: number; level: ScoreLevel }> = {};
  for (const sys of SYSTEMS) {
    const dimScores = sys.dimensions
      .map((d) => dimensionScores[d])
      .filter((s) => s !== undefined);
    const score = dimScores.length > 0
      ? Math.round(dimScores.reduce((sum, s) => sum + s, 0) / dimScores.length)
      : 0;
    systemScores[sys.code] = { score, level: getScoreLevel(score) };
  }

  return {
    moduleScores,
    dimensionScores,
    systemScores,
    dLevel: systemScores["D"].level,
    aLevel: systemScores["A"].level,
    pLevel: systemScores["P"].level,
  };
}

// ==========================================
// Helper lookups
// ==========================================

export function getModuleByCode(code: string) {
  return moduleMap.get(code);
}

export function getDimensionByCode(code: string) {
  return dimMap.get(code);
}

export function getSystemByCode(code: string) {
  return sysMap.get(code);
}

export function getModuleForQuestion(order: number): string | undefined {
  return QUESTION_MODULE_MAP[order];
}

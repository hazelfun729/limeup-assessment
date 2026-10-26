export const REPORT_PROMPTS = {
  system: "成长导航 V4 · 共用写作",
  type1: "成长导航 V4 · 1型",
  general: "成长导航 V4 · 2—27型",
} as const;

// User clarification on 2026-09-29; the source document snapshot stays verbatim.
export const REPORT_PRESENTATION_RULE = "正式报告不显示任何测评分数或分数表，综合评分只作为后台分析依据。请用 Markdown 输出六章正文，章标题使用二级标题（## 第一章 …），章内小标题使用三级标题，阶段安排使用表格；不输出HTML、代码围栏、基本信息表或固定结语。";

export function reportBranch(combination: string) {
  return combination === "强_强_强" ? REPORT_PROMPTS.type1 : REPORT_PROMPTS.general;
}

export const ANSWER_LABELS: Record<string, string> = {
  ALWAYS: "非常符合", OFTEN: "比较符合", SOMETIMES: "比较不符合", RARELY: "非常不符合", UNKNOWN: "不了解",
};

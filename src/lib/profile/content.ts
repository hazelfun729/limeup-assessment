import { getScoreLevel } from "@/lib/assessment-constants";
export const REPORT_PRICE = { current: "9.9", original: "39.9" };
export const LETTER_QUESTIONS = [
  "你对孩子未来的学习与成长，有怎样的期待？",
  "眼下最困扰你的1—3个问题是什么？可以举一件最近发生的小事。",
  "你最希望先聊哪一个问题？已经尝试过什么，效果如何？",
  "孩子有哪些地方，是你欣赏和珍惜的？",
  "其他还想说的",
];
export const CONSULTATION_INTRO =
  "测评能帮助我们看见整体状态，而你们生活里的具体经历，能让这份理解更进一步。欢迎你写一封信，说说：";
export const CONSULTATION_REPLY =
  "收到来信后，柚子老师会在3个工作日内给你一封免费的初步回信，结合你提供的信息，谈谈可能的原因，以及可以尝试的支持方式。";
export const CONSULTATION_CHOICE =
  "你可以先读回信，再决定是否需要进一步咨询，或是否需要参考成长导航报告。";
export const REPORT_BENEFITS = [
  "找到下一阶段优先支持的方向",
  "把理解带回具体的学科学习场景",
  "尝试更适合孩子的亲子沟通方式",
  "参考一份可以逐步开始的行动计划",
];
export type ProfileCopy = {
  number: number;
  combination: string;
  animal: string;
  title: string;
  paragraphs: string[];
  action: string;
};
export type ScoreView = {
  code: string;
  name: string;
  score: number | null;
  dimensions: {
    code: string;
    name: string;
    modules: string[];
    score: number | null;
  }[];
};
export type ProfileView = {
  id: string;
  assessmentId: string;
  version: string;
  copy: ProfileCopy;
  emoji: string;
  systems: ScoreView[];
  purchase: { label: string; href: string; purchased: boolean };
};

// Accept four-answer submissions from already-open pages; the new fifth answer is optional.
export function normalizeLetterAnswers(value: unknown): string[] | null {
  if (!Array.isArray(value) || ![4, 5].includes(value.length)) return null;
  if (
    value.some(
      (answer, index) =>
        typeof answer !== "string" ||
        answer.length > 4000 ||
        (index < 4 && !answer.trim()),
    )
  )
    return null;
  return LETTER_QUESTIONS.map((_, index) => (value[index] || "").trim());
}

export const SCORE_TONES = {
  强: { bar: "#8ca128", text: "#566516", background: "#f0f4dd" },
  中: { bar: "#edaa36", text: "#8a590d", background: "#fff4de" },
  弱: { bar: "#dc6267", text: "#ad383f", background: "#fdecee" },
};
export function scorePresentation(score: number | null) {
  if (score === null)
    return {
      level: "信息不足",
      bar: "#d5d5cf",
      text: "#66665e",
      background: "#f1f1ee",
    };
  const level = getScoreLevel(score);
  return { level, ...SCORE_TONES[level] };
}
export const REPORT_DELIVERABLES = [
  {
    title: "先支持什么",
    detail: "梳理当前更值得优先关注的方向，让每天的支持有重点。",
    question: "问题很多，先从哪一件事开始？",
  },
  {
    title: "学习时怎么用",
    detail: "结合具体学科与学习场景，理解孩子遇到的困难和可尝试的方法。",
    question: "学习遇到困难时，可以怎样支持？",
  },
  {
    title: "沟通时怎么说",
    detail: "参考适合孩子当前状态的沟通方式，把催促换成更具体的支持。",
    question: "同样一句提醒，怎样说更容易被听见？",
  },
  {
    title: "接下来怎么做",
    detail: "参考分阶段的行动安排，从一小步开始，再根据反馈调整。",
    question: "看懂之后，第一步该做什么？",
  },
];

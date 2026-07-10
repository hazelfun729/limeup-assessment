/**
 * Learning Type Classification — 8 Animal Archetypes
 *
 * Based on 3 system scores: D(动力), A(能力), P(毅力)
 * Each system scored as: 强(H), 中(M), 弱(L)
 *
 * 27 combinations → exact lookup table from XLSX.
 */

import type { ScoreLevel } from "@/lib/assessment-constants";

export interface LearningType {
  code: string;
  name: string;
  emoji: string;
  coreBottleneck: string;
  coreTraits: string;
  keyStrategies: string[];
  conversionPath: string;
}

// 8 Animal Archetypes
export const LEARNING_TYPES: Record<string, LearningType> = {
  SHEEP: {
    code: "SHEEP",
    name: "绵羊型",
    emoji: "🐑",
    coreBottleneck: "动力",
    coreTraits:
      "如绵羊般温顺、合群，其学习状态高度依赖外部环境的指引和氛围。在明确的指令、持续的督促和良好的学习氛围中能较好地完成学习任务，但缺乏自主规划和内在驱动。",
    keyStrategies: [
      "重建内在动力：创造安全、鼓励的微环境，从擅长领域入手创造成功体验",
      "提供结构化支持：给予清晰、具体的指令，将大任务分解为可执行步骤",
      "利用积极的同伴影响：安排与积极主动的同学组成学习小组",
    ],
    conversionPath: "绵羊 → 孔雀 → 狮子",
  },
  SNAIL: {
    code: "SNAIL",
    name: "蜗牛型",
    emoji: "🐌",
    coreBottleneck: "动力",
    coreTraits:
      "如蜗牛般有韧性能坚持完成学习任务，但内在动力严重不足，常感到学习是被迫、枯燥的。内心的抗拒导致方法僵化、效率低下。",
    keyStrategies: [
      "重建学习意义感：帮助将学习与个人生活、未来梦想联系起来",
      "设计低起点任务：从极小、易成功的任务开始，快速累积成功体验",
      "强调过程鼓励：关注并表扬坚持的过程和微小进步，而非仅看结果",
    ],
    conversionPath: "蜗牛 → 黄牛 → 狮子",
  },
  BEE: {
    code: "BEE",
    name: "工蜂型",
    emoji: "🐝",
    coreBottleneck: "动力",
    coreTraits:
      "如蜂群中的工蜂，兢兢业业、持之以恒、可靠稳定、遵守规则。能严格按照要求保质保量地完成学习任务，基础扎实，但缺乏灵活性和创造性思维。",
    keyStrategies: [
      "激发内在好奇心：通过联系生活实际、讲述知识背后故事等方式引导",
      "引入适度挑战：提供\"跳一跳\"能够着的挑战性任务，鼓励尝试不同思路",
      "鼓励合作与表达：创造机会在小组中分享稳健的解题思路",
    ],
    conversionPath: "直接转化：从高效执行者转变为规则优化者与团队引导者",
  },
  PONY: {
    code: "PONY",
    name: "小马驹型",
    emoji: "🐎",
    coreBottleneck: "能力",
    coreTraits:
      "如充满活力的小马驹，对学习充满好奇与初始热情，愿意尝试新领域。但因方法欠缺和耐力不足，探索容易浅尝辄止，难以深入。",
    keyStrategies: [
      "搭建探索脚手架：将兴趣点拆解为具体、可操作的小任务",
      "创造即时成就感：完成每个小任务后给予及时、具体的积极反馈",
      "引导深度兴趣：将短暂兴趣引导至一个具体的微项目",
    ],
    conversionPath: "小马驹 → 孔雀 → 狮子",
  },
  OX: {
    code: "OX",
    name: "黄牛型",
    emoji: "🐂",
    coreBottleneck: "能力",
    coreTraits:
      "如老黄牛般踏实勤恳，有强烈的上进心和惊人的毅力。学习态度极其踏实、勤奋，有股不服输的韧劲，愿意投入大量时间精力，但方法效率有待提升。",
    keyStrategies: [
      "输入高效方法：教授费曼学习法、思维导图、结构化笔记等工具",
      "优化时间与精力分配：识别优先级，将最旺盛精力用于攻克最难部分",
      "建立反馈循环：通过错题本、自测等方式进行自我监控与评估",
    ],
    conversionPath: "直接转化：一旦弥补学习方法短板，动力与毅力将转化为全面领先",
  },
  PEACOCK: {
    code: "PEACOCK",
    name: "孔雀型",
    emoji: "🦚",
    coreBottleneck: "毅力",
    coreTraits:
      "如孔雀般聪明、有悟性，在感兴趣的领域能迸发出惊人的创造力和深度见解。但学习状态波动较大，持久力和专注力是短板，容易受情绪和兴趣驱动。",
    keyStrategies: [
      "保护与聚焦：肯定创造力，引导将好点子落实成短期可见成果的小项目",
      "建立规律性输出：通过定期展示、讲解成果，促使将灵感转化为稳定输出",
      "强化抗挫训练：设定合理心理预期，学习在暂时不成功时调整策略",
    ],
    conversionPath: "孔雀 → 黄牛 → 狮子",
  },
  COCOON: {
    code: "COCOON",
    name: "虫茧型",
    emoji: "🐛",
    coreBottleneck: "亲子关系",
    coreTraits:
      "当前在学习上面临全方位的挑战，如同毛毛虫进入\"结茧期\"，感到全面的能量枯竭、信心受挫，常伴有焦虑、逃避等情绪。这并非能力不足，而是底层生命能量需要修复。",
    keyStrategies: [
      "优先关系修复：学业干预暂缓，首要重建安全、信任的亲子与师生关系",
      "积蓄心理能量：从非学业活动（运动、艺术、户外）入手，创造无压力的成功体验",
      "极微小目标启动：当心理能量回升时，设置几乎不可能失败的学习小目标",
    ],
    conversionPath: "不可急于转化！先破茧成蝶：恢复基础心理能量后再逐步发展",
  },
  LION: {
    code: "LION",
    name: "狮子型",
    emoji: "🦁",
    coreBottleneck: "无",
    coreTraits:
      "如狮子般是天生的\"领跑者\"。拥有强大的内在求知欲和清晰目标感，掌握了高效的学习方法与策略，更能以惊人的毅力持续行动、面对挫折不屈不挠。",
    keyStrategies: [
      "提供挑战与深度：提供超越课本的拓展材料和研究性项目，保持学术饥饿感",
      "赋予引领责任：鼓励担任\"小老师\"或学习小组长，在教授他人中深化理解",
      "布局未来：提升自我认知，助其实现人生、生命维度的幸福与突破",
    ],
    conversionPath: "布局未来，提升自我认知，助其实现人生、生命维度的幸福、成就与突破",
  },
};

/**
 * 27-row exact lookup table from XLSX.
 * Key format: "D_A_P" where each is 强/中/弱
 */
const CLASSIFICATION_TABLE: Record<string, string> = {
  "强_强_强": "LION",
  "强_强_中": "PEACOCK",
  "强_强_弱": "PEACOCK",
  "强_中_强": "OX",
  "强_中_中": "OX",
  "强_中_弱": "PEACOCK",
  "强_弱_强": "OX",
  "强_弱_中": "PONY",
  "强_弱_弱": "PONY",
  "中_强_强": "BEE",
  "中_强_中": "BEE",
  "中_强_弱": "PEACOCK",
  "中_中_强": "OX",
  "中_中_中": "SHEEP",
  "中_中_弱": "SHEEP",
  "中_弱_强": "SNAIL",
  "中_弱_中": "SNAIL",
  "中_弱_弱": "COCOON",
  "弱_强_强": "BEE",
  "弱_强_中": "BEE",
  "弱_强_弱": "SHEEP",
  "弱_中_强": "SNAIL",
  "弱_中_中": "SHEEP",
  "弱_中_弱": "COCOON",
  "弱_弱_强": "SNAIL",
  "弱_弱_中": "COCOON",
  "弱_弱_弱": "COCOON",
};

/**
 * Classify learning type from 3 system levels — exact 27-row lookup
 */
export function classifyLearningType(
  dLevel: ScoreLevel,
  aLevel: ScoreLevel,
  pLevel: ScoreLevel
): LearningType {
  const key = `${dLevel}_${aLevel}_${pLevel}`;
  const typeCode = CLASSIFICATION_TABLE[key] || "SHEEP";
  return LEARNING_TYPES[typeCode];
}

/**
 * Determine growth focus based on the weakest system and type
 */
export function determineGrowthFocus(
  type: LearningType,
  systemScores: Record<string, { score: number; level: ScoreLevel }>
): { focus: string; detail: string } {
  const dScore = systemScores["D"]?.score ?? 0;
  const aScore = systemScores["A"]?.score ?? 0;
  const pScore = systemScores["P"]?.score ?? 0;

  const scores = [
    { code: "D", name: "学习动力", score: dScore },
    { code: "A", name: "学习能力", score: aScore },
    { code: "P", name: "学习毅力", score: pScore },
  ];
  scores.sort((a, b) => a.score - b.score);
  const weakest = scores[0];

  const focusMap: Record<string, string> = {
    D: "激发内在学习动力与自信心",
    A: "培养高效学习方法与思维能力",
    P: "提升学习毅力与情绪调节能力",
  };

  const detailMap: Record<string, string> = {
    D: "孩子当前最需要的是找到\"为什么而学\"的内在动力。建议从孩子感兴趣的事物出发，帮助他看到学习与自身生活的联系，在日常中多给予积极反馈和自主选择的权利，逐步建立\"我要学\"的内在驱动。",
    A: "孩子当前最需要的是掌握高效的学习方法。建议引导孩子学会目标规划、结构化思考和自我反思，用\"教别人\"的方式深化理解，逐步从\"死记硬背\"转向\"理解应用\"。",
    P: "孩子当前最需要的是培养持续坚持的毅力。建议从每天15分钟的微习惯开始，建立规律的学习节奏，同时教孩子识别和管理负面情绪，在遇到挫折时学会调整心态而非放弃。",
  };

  return {
    focus: focusMap[weakest.code] || type.coreBottleneck,
    detail: detailMap[weakest.code] || type.coreTraits,
  };
}

/**
 * Generate a single actionable suggestion
 */
export function generateActionSuggestion(type: LearningType): string {
  const suggestions: Record<string, string> = {
    SHEEP: "从今天开始，让孩子每天自主选择一件想做的事（哪怕很小），完成后给予具体的肯定，连续坚持7天，帮助他体验\"是我自己要做的\"这种感觉。",
    SNAIL: "找一个孩子不排斥的小任务（如每天读10分钟他喜欢的书），完成后具体地肯定他的坚持，连续5天后稍微加量，让他逐渐体验\"坚持也可以不难受\"。",
    BEE: "这周尝试让孩子用一种新的方法来做一件他经常做的事（如用思维导图整理一周学过的知识），然后聊聊新方法跟以前有什么不同、哪个更好。",
    PONY: "从孩子目前最感兴趣的一个主题出发，和他一起制定一个7天小计划，每天完成一小步，7天后做一个小展示（如给家人讲讲），让他体验\"深入\"的成就感。",
    OX: "选择一个孩子觉得困难的学科，教他用\"先讲给自己听、再讲给别人听\"的费曼学习法来学习一个知识点，对比之前的学习效果。",
    PEACOCK: "选一个孩子最有创意的好点子，帮他制定一个3天就能看到结果的小计划，每天记录进展，完成后做一个小展示，让他体验\"把灵感变成成果\"的快乐。",
    COCOON: "暂时放下学业压力，每天花20分钟和孩子一起做一件他喜欢的非学习活动（如散步、画画、打球），先修复亲子间的信任和安全感。",
    LION: "鼓励孩子选择一个有挑战性的项目（如参加竞赛或研究性课题），并尝试当一次\"小老师\"，把学到的东西教给同学或家人，在教授中深化理解。",
  };
  return suggestions[type.code] || type.keyStrategies[0];
}

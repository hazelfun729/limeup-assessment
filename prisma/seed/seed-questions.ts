/**
 * Seed script: Load 3-9-27 hierarchy + 66 questions into database
 *
 * Run: npx tsx prisma/seed/seed-questions.ts
 *
 * Data source: XLSX "学习模式类型&自主学习力诊断测评-updated.xlsx"
 * Parsed hierarchy and question data hardcoded from XLSX extraction.
 */

import { createPrismaClient } from "./prisma-helper";

// ==========================================
// 3-9-27 Hierarchy Definition
// ==========================================

const SYSTEMS = [
  { code: "D", name: "学习动力", nameEn: "motivation", desc: "不想学、学不进", order: 1 },
  { code: "A", name: "学习能力", nameEn: "ability", desc: "学了就忘、会但做错", order: 2 },
  { code: "P", name: "学习毅力", nameEn: "perseverance", desc: "三分钟热度、畏难退缩", order: 3 },
];

const DIMENSIONS = [
  { code: "DR_INNER", name: "内驱力", systemCode: "D", desc: "不知道自己为什么要学习", order: 1 },
  { code: "DR_CONF", name: "自信心", systemCode: "D", desc: "自己很差劲，不可能学好", order: 2 },
  { code: "DR_START", name: "行动启动器", systemCode: "D", desc: "开始做一件事的行动力", order: 3 },
  { code: "AB_PLAN", name: "规划力", systemCode: "A", desc: "不走心、漫无目的", order: 1 },
  { code: "AB_THINK", name: "思维力", systemCode: "A", desc: "死记硬背、不求甚解", order: 2 },
  { code: "AB_REFLECT", name: "反思力", systemCode: "A", desc: "标准模糊、不会分析根源", order: 3 },
  { code: "PE_DURABLE", name: "学习耐久力", systemCode: "P", desc: "无法忍受高强度用脑", order: 1 },
  { code: "PE_EMOTION", name: "情绪调节力", systemCode: "P", desc: "受负面情绪影响无法思考", order: 2 },
  { code: "PE_RESILIENCE", name: "抗挫力", systemCode: "P", desc: "畏难、退缩、容易放弃", order: 3 },
];

const MODULES = [
  { code: "M_AUTONOMY", name: "自主感", dimCode: "DR_INNER", order: 1 },
  { code: "M_MEANING", name: "意义感", dimCode: "DR_INNER", order: 2 },
  { code: "M_INTEREST", name: "兴趣驱动", dimCode: "DR_INNER", order: 3 },
  { code: "M_WORTH", name: "价值感", dimCode: "DR_CONF", order: 1 },
  { code: "M_EFFICACY", name: "效能感", dimCode: "DR_CONF", order: 2 },
  { code: "M_BELONGING", name: "归属感", dimCode: "DR_CONF", order: 3 },
  { code: "M_AWARENESS", name: "自我觉察", dimCode: "DR_START", order: 1 },
  { code: "M_SAFETY", name: "安全感", dimCode: "DR_START", order: 2 },
  { code: "M_LAUNCH", name: "启动策略", dimCode: "DR_START", order: 3 },
  { code: "M_GOAL", name: "目标管理", dimCode: "AB_PLAN", order: 1 },
  { code: "M_STRATEGY", name: "策略计划", dimCode: "AB_PLAN", order: 2 },
  { code: "M_TIME", name: "时间管理", dimCode: "AB_PLAN", order: 3 },
  { code: "M_MEMORY", name: "理解和记忆", dimCode: "AB_THINK", order: 1 },
  { code: "M_ANALYSIS", name: "思考和分析", dimCode: "AB_THINK", order: 2 },
  { code: "M_TRANSFER", name: "应用和迁移", dimCode: "AB_THINK", order: 3 },
  { code: "M_MONITOR", name: "监控评估能力", dimCode: "AB_REFLECT", order: 1 },
  { code: "M_ROOTCAUSE", name: "深度归因能力", dimCode: "AB_REFLECT", order: 2 },
  { code: "M_PROCESS", name: "程序定制能力", dimCode: "AB_REFLECT", order: 3 },
  { code: "M_BRAIN", name: "大脑健康有活力", dimCode: "PE_DURABLE", order: 1 },
  { code: "M_FOCUS", name: "专注与自制力", dimCode: "PE_DURABLE", order: 2 },
  { code: "M_SELFBOOST", name: "自我激励的能力", dimCode: "PE_DURABLE", order: 3 },
  { code: "M_EMOTION_ID", name: "情绪识别", dimCode: "PE_EMOTION", order: 1 },
  { code: "M_NEG_SOOthe", name: "负面情绪安抚", dimCode: "PE_EMOTION", order: 2 },
  { code: "M_POS_SPARK", name: "正面情绪激发", dimCode: "PE_EMOTION", order: 3 },
  { code: "M_GROWTH", name: "成长型思维", dimCode: "PE_RESILIENCE", order: 1 },
  { code: "M_FLEXIBILITY", name: "心理灵活性", dimCode: "PE_RESILIENCE", order: 2 },
  { code: "M_TOUGHNESS", name: "韧性", dimCode: "PE_RESILIENCE", order: 3 },
];

// 66 Questions from XLSX (order, stage, moduleCode, content, isReverseScored)
const QUESTIONS: Array<{
  order: number;
  stage: number;
  moduleCode: string;
  content: string;
  isReverseScored: boolean;
  scoreValues: Record<string, number>;
}> = [
  // === 学习动力 · 内驱力 · 自主感 ===
  { order: 1, stage: 1, moduleCode: "M_AUTONOMY", content: "孩子学任何东西都是懒洋洋的、无精打采；只要老师、家长没安排学习任务，他就肯定不会去学习", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 2, stage: 1, moduleCode: "M_AUTONOMY", content: "孩子很有主见，对自己的特点、喜好、优势、短板都挺了解的，自己的事一般都是自己做主，做决定很果断", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 内驱力 · 意义感 ===
  { order: 3, stage: 1, moduleCode: "M_MEANING", content: "孩子常抱怨\"为什么要学这些？\"\"学这个有什么用？\"；常说\"不喜欢xx科目\"，但问为什么不喜欢，他又说不出原因", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 4, stage: 1, moduleCode: "M_MEANING", content: "孩子的日常活动很丰富，在学习之外，还经常尝试去做各种不同类型的事，和各种不同职业的人打交道，有自己敬佩/想成为的榜样人物", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 内驱力 · 兴趣驱动 ===
  { order: 5, stage: 1, moduleCode: "M_INTEREST", content: "孩子经常兴高采烈地分享今天学了什么有趣的新知识", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 6, stage: 1, moduleCode: "M_INTEREST", content: "孩子有自己很喜欢做的事，经常长时间专注地沉迷其中（不限于学习，但不包括电子产品）", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 7, stage: 1, moduleCode: "M_INTEREST", content: "孩子对大多数事物都表现得缺乏热情，没有特别想要的东西，也没有特别想追求的生活", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 8, stage: 1, moduleCode: "M_INTEREST", content: "孩子好胜心很强，总说\"我要得第几名\"\"我要赢过谁谁谁\"，会跟人比赛写作业等", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 自信心 · 价值感 ===
  { order: 9, stage: 1, moduleCode: "M_WORTH", content: "孩子能在任何场合大方、友好地对任何人表达：\"我的看法跟你不同\"\"我不喜欢这样\"，而不担心别人因此不喜欢自己", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 10, stage: 1, moduleCode: "M_WORTH", content: "孩子倾向于全方位地自我否定，比如常说\"我天生就是笨\"\"我什么都干不好\"\"我没有任何优点\"", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 自信心 · 效能感 ===
  { order: 11, stage: 1, moduleCode: "M_EFFICACY", content: "面对任何挑战性的任务（如参加体育或艺术比赛、挑战难题、出席人多的社交场合），孩子都能充满信心地积极参与", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 12, stage: 1, moduleCode: "M_EFFICACY", content: "孩子成功时，会忽视自己的努力，归因于\"运气好、考得太简单\"等外部因素；失败时则会归因于\"我天生就笨、不是这块料\"", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 13, stage: 1, moduleCode: "M_EFFICACY", content: "孩子在学习之外，还有很多\"做成一件事\"的体验（哪怕很小的事也可以，比如做家务）", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 自信心 · 归属感 ===
  { order: 14, stage: 1, moduleCode: "M_BELONGING", content: "孩子对上学表现出明显的排斥和焦虑，如经常表达不愿上学、要求请假，或在上学前出现头疼、肚子疼等身体不适", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 15, stage: 1, moduleCode: "M_BELONGING", content: "孩子在学校有很多好朋友，也常被老师表扬；遇到问题时，会主动寻求同学、老师、家人的帮助", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 行动启动器 · 自我觉察 ===
  { order: 16, stage: 1, moduleCode: "M_AWARENESS", content: "孩子在磨蹭拖延时，问他\"为什么不想做？\"他能准确、具体地说明原因，如\"任务太多了，做不完\"\"这个太难了，不知道怎么下手\"", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 行动启动器 · 安全感 ===
  { order: 17, stage: 1, moduleCode: "M_SAFETY", content: "孩子很容易适应新环境，会主动、或在父母的鼓励下很乐意地尝试新事物；喜欢和父母在一起，父母离开时会想念", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 18, stage: 1, moduleCode: "M_SAFETY", content: "孩子情绪容易失控、父母安抚也没用；或过分压抑自己，从不发脾气，表现出与年龄不符的\"懂事\"", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 19, stage: 1, moduleCode: "M_SAFETY", content: "孩子经常眉头紧锁、身体肌肉僵硬、动作拘谨而不放松舒展；在重要考试的前几天会睡不着觉", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 行动启动器 · 启动策略 ===
  { order: 20, stage: 1, moduleCode: "M_LAUNCH", content: "孩子写作业需要三催四请，总是拖到最后一刻才不得不开始", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 学习能力 · 规划力 · 目标管理 ===
  { order: 21, stage: 2, moduleCode: "M_GOAL", content: "孩子认认真真做了很多题、上了很多补习班，所有能用的时间都用在学习上了，但成绩就是不见提高", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 22, stage: 2, moduleCode: "M_GOAL", content: "孩子对于某个学科是否需要预习，上课时哪些内容需要记笔记，哪些错题需要整理、整理后如何复习，都有自己的一套方法", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 23, stage: 2, moduleCode: "M_GOAL", content: "孩子经常立大而笼统的flag，如\"学好英语、提高语文\"，说不清为什么要立，也不会分解为可执行的阶段目标", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 规划力 · 策略计划 ===
  { order: 24, stage: 2, moduleCode: "M_STRATEGY", content: "孩子有学习策略，不是哪里差就多花点时间、或者喜欢哪科就学哪科，而是会将自己要提高的各科目排出优先级，并制定有针对性的提升计划", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 25, stage: 2, moduleCode: "M_STRATEGY", content: "孩子会将时间精力集中到投入产出比最高、最重要的任务上，有时甚至会花80%的时间猛攻20%最关键的内容", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 规划力 · 时间管理 ===
  { order: 26, stage: 2, moduleCode: "M_TIME", content: "孩子每天会将各项任务安排在最能高效完成的时间点（如深度思考需要整段时间、背单词用碎片时间）", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 27, stage: 2, moduleCode: "M_TIME", content: "孩子能较准确地估算完成一项任务所需时间，误差不超过20%，因此总能高效兼顾学习和生活", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 思维力 · 理解和记忆 ===
  { order: 28, stage: 2, moduleCode: "M_MEMORY", content: "孩子背诵课文、单词很快，读两遍就能背，一周、一个月之后提问仍然能回忆起大部分；从来不觉得背诵是困难的事", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 29, stage: 2, moduleCode: "M_MEMORY", content: "孩子当天在学校学过的内容，可以用自己的话总结、表达出来，内容准确；学校布置的作业都能自主、按时完成", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 思维力 · 思考和分析 ===
  { order: 30, stage: 2, moduleCode: "M_ANALYSIS", content: "孩子做事或解题时步骤清晰、有条理，常说\"第一步，第二步…\"\"首先…然后…\"\"因为…所以…\"", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 31, stage: 2, moduleCode: "M_ANALYSIS", content: "孩子擅长归纳总结，如将琐碎知识分类、分层、提炼共性特点，将重要知识点/公式常用的关联整理成结构化的笔记", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 32, stage: 2, moduleCode: "M_ANALYSIS", content: "孩子会将有必要复习的错题根据错误难度、涉及的知识点和题目难度等各种维度进行分类，找到高频错误类型并集中攻克", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 思维力 · 应用和迁移 ===
  { order: 33, stage: 2, moduleCode: "M_TRANSFER", content: "很多知识孩子说自己学会了，过几天再碰到类似的题，只是换个情境、换个方式问，他就又不会了", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 34, stage: 2, moduleCode: "M_TRANSFER", content: "孩子有出题人思维，能说出来每道题是要考察自己哪些知识点或技巧、通常会设置哪些陷阱", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 35, stage: 2, moduleCode: "M_TRANSFER", content: "孩子喜欢研究一题多解，生活中也会为了解决问题从不同角度想出不同的方法", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 36, stage: 2, moduleCode: "M_TRANSFER", content: "孩子能够将A学科（如数学的思维导图）的方法，迁移应用到B学科（如语文课文复习）或生活中", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 反思力 · 监控评估能力 ===
  { order: 37, stage: 2, moduleCode: "M_MONITOR", content: "听课没听懂时，能明确指出自己具体哪一步听不懂；提问时，能明确说出自己已经尝试了哪些方法但没有效果", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 38, stage: 2, moduleCode: "M_MONITOR", content: "孩子对于学习材料的难度是否适合自己，有很清晰的判断，常常会从不同的教辅里挑选部分题目来做，检测自己的水平", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 39, stage: 2, moduleCode: "M_MONITOR", content: "孩子对于自己是否\"学好了\"有明确、量化的标准（如对照各题型的评分标准），会准确地评估自己的掌握程度", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 反思力 · 深度归因能力 ===
  { order: 40, stage: 2, moduleCode: "M_ROOTCAUSE", content: "孩子会长期、反复犯同一种类型的错误；也经常犯一些\"会但不准确\"的错误，如看错看漏条件、计算失误等", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 41, stage: 2, moduleCode: "M_ROOTCAUSE", content: "孩子在分析自己的错误时，不会笼统地外部归因\"粗心了、题太难、外面太吵\"，而是会做具体的内部归因，如\"我读题时手和眼不参与导致专注度不够\"", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 反思力 · 程序定制能力 ===
  { order: 42, stage: 2, moduleCode: "M_PROCESS", content: "孩子会根据自己的薄弱点，形成避免下次再犯类似错误的解决方法，并总结成程序：一套清晰的dos and donts清单", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 43, stage: 2, moduleCode: "M_PROCESS", content: "孩子会反复实践、验证和优化这个程序，直到彻底不再犯这类错误；当程序失效或遇到新问题时，又会重复上述过程", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 44, stage: 2, moduleCode: "M_PROCESS", content: "孩子会反复尝试和对比各种不同的学习方法，\"发明\"对自己来说最高效的方式", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 学习毅力 · 学习耐久力 · 大脑健康有活力 ===
  { order: 45, stage: 3, moduleCode: "M_BRAIN", content: "孩子每天睡眠充足，入睡容易，中途不易醒来，起床时很精神，常常不用闹钟就能自然醒", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 46, stage: 3, moduleCode: "M_BRAIN", content: "孩子平均每天运动（能明显感到心跳加速、微微出汗）时间不少于30分钟，在户外活动的时间更多", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 47, stage: 3, moduleCode: "M_BRAIN", content: "孩子身体健康，很少生病或身体不适，每天按时吃饭，饮食均衡，不偏食、不暴食，喝水8杯以上", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 48, stage: 3, moduleCode: "M_BRAIN", content: "孩子热爱阅读，会主动找各种类型和主题的书来读", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 学习耐久力 · 专注与自制力 ===
  { order: 49, stage: 3, moduleCode: "M_FOCUS", content: "孩子做感兴趣的事情时，能持续30分钟以上完全专注，周围的事和声音很难打扰到他", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 50, stage: 3, moduleCode: "M_FOCUS", content: "孩子的学习环境凌乱，经常找不到学习用品", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 51, stage: 3, moduleCode: "M_FOCUS", content: "孩子能在不同任务间顺利切换（如写完数学后开始读语文），被突发事件打断后，也能较快地重新集中注意力", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 52, stage: 3, moduleCode: "M_FOCUS", content: "孩子经常打扰别人的谈话或活动，问题还没有听完就开始抢答，在需要轮流进行的活动中常常没有耐心等待", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 53, stage: 3, moduleCode: "M_FOCUS", content: "孩子很容易冲动，经常忍不住去做一些事情，即使知道那样做是错的、或者对自己的健康有害", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 学习耐久力 · 自我激励的能力 ===
  { order: 54, stage: 3, moduleCode: "M_SELFBOOST", content: "做难度较大或数量较多的学习任务时，孩子经常自我鼓励，如\"我可以的\"\"我真厉害，这个都会\"\"再做5道题就休息\"", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 情绪调节力 · 情绪识别 ===
  { order: 55, stage: 3, moduleCode: "M_EMOTION_ID", content: "孩子情绪不好时，能很快意识到，主动要求暂停手上的事，开始寻求帮助、安慰或自我疏导", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 56, stage: 3, moduleCode: "M_EMOTION_ID", content: "孩子能明确识别自己的具体情绪，如表达\"我现在很委屈、沮丧、愤怒……是因为我感到被不公平对待了\"", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 情绪调节力 · 负面情绪安抚 ===
  { order: 57, stage: 3, moduleCode: "M_NEG_SOOthe", content: "孩子心情不好或压力很大时，能以不伤害他人和自己的方式，自我疏导或释放，如记日记、运动、找人倾诉、画画等", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 58, stage: 3, moduleCode: "M_NEG_SOOthe", content: "孩子做事情时容易烦躁、发脾气，很久也不能静下心来冷静分析；考试时总会因为紧张、沮丧而发挥失常", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 情绪调节力 · 正面情绪激发 ===
  { order: 59, stage: 3, moduleCode: "M_POS_SPARK", content: "孩子是一个很乐观的人，不管遇到什么问题都习惯性地往好处想", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  { order: 60, stage: 3, moduleCode: "M_POS_SPARK", content: "孩子喜欢分享笑话、趣事，善于发现生活中的小美好、小确幸，比如记录自己的小进步，感恩帮助过自己的人", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 抗挫力 · 成长型思维 ===
  { order: 61, stage: 3, moduleCode: "M_GROWTH", content: "孩子常说\"努力有什么用，还不是比不过那些天生聪明的\"，羡慕那些成绩比自己好但爱玩的同学", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 62, stage: 3, moduleCode: "M_GROWTH", content: "听说别人的成功，孩子第一反应是沮丧、嫉妒，对他来说别人的成功意味着自己的失败", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 63, stage: 3, moduleCode: "M_GROWTH", content: "当被批评、失败时，孩子不会思考如何改进，而是会找各种借口辩解、逃避，或者说\"我天生就不是这块料\"", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  // === 抗挫力 · 心理灵活性 ===
  { order: 64, stage: 3, moduleCode: "M_FLEXIBILITY", content: "当一种方法行不通时，孩子不会钻牛角尖，而是马上尝试其他办法，或开始查资料、寻求帮助", isReverseScored: false, scoreValues: { ALWAYS: 100, OFTEN: 90, SOMETIMES: 30, RARELY: 0, UNKNOWN: 0 } },
  // === 抗挫力 · 韧性 ===
  { order: 65, stage: 3, moduleCode: "M_TOUGHNESS", content: "孩子面对难题和连续的挫败、枯燥、耗时长的任务（如背单词、运动打卡）时，很快就会选择放弃，且再也不愿尝试", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
  { order: 66, stage: 3, moduleCode: "M_TOUGHNESS", content: "孩子面对挫折、失败时，会连续一两周陷入沮丧情绪中，难以恢复，并倾向于得到灾难性、永久化的结论，如\"我完了，我永远都不可能学好数学了\"\"我就是个笨蛋\"", isReverseScored: true, scoreValues: { ALWAYS: 0, OFTEN: 30, SOMETIMES: 90, RARELY: 100, UNKNOWN: 0 } },
];

// ==========================================
// Seed Function
// ==========================================

async function seed() {
  const prisma = await createPrismaClient();
  console.log("🌱 Seeding 3-9-27 hierarchy + 66 questions...\n");

  // 1. Create Systems
  const systemMap = new Map<string, string>();
  for (const sys of SYSTEMS) {
    const record = await prisma.system.upsert({
      where: { code: sys.code },
      create: { code: sys.code, name: sys.name, nameEn: sys.nameEn, desc: sys.desc, order: sys.order },
      update: { name: sys.name, nameEn: sys.nameEn, desc: sys.desc, order: sys.order },
    });
    systemMap.set(sys.code, record.id);
    console.log(`  ✅ System: ${sys.name} (${sys.code})`);
  }

  // 2. Create Dimensions
  const dimMap = new Map<string, string>();
  for (const dim of DIMENSIONS) {
    const systemId = systemMap.get(dim.systemCode)!;
    const record = await prisma.dimension.upsert({
      where: { code: dim.code },
      create: { code: dim.code, name: dim.name, systemId, desc: dim.desc, order: dim.order },
      update: { name: dim.name, systemId, desc: dim.desc, order: dim.order },
    });
    dimMap.set(dim.code, record.id);
    console.log(`  ✅ Dimension: ${dim.name} (${dim.code})`);
  }

  // 3. Create Modules
  const modMap = new Map<string, string>();
  for (const mod of MODULES) {
    const dimensionId = dimMap.get(mod.dimCode)!;
    const record = await prisma.module.upsert({
      where: { code: mod.code },
      create: { code: mod.code, name: mod.name, dimensionId, order: mod.order },
      update: { name: mod.name, dimensionId, order: mod.order },
    });
    modMap.set(mod.code, record.id);
    console.log(`  ✅ Module: ${mod.name} (${mod.code})`);
  }

  // 4. Create/Get QuestionVersion
  let version = await prisma.questionVersion.findFirst({
    where: { isActive: true },
  });
  if (!version) {
    version = await prisma.questionVersion.create({
      data: { version: 1, isActive: true, description: "V1 - 66题初版题库" },
    });
  }
  console.log(`\n  ✅ QuestionVersion: v${version.version} (${version.id})`);

  // 5. Create Questions
  let created = 0;
  let updated = 0;
  for (const q of QUESTIONS) {
    const moduleId = modMap.get(q.moduleCode);
    if (!moduleId) {
      console.error(`  ❌ Module not found: ${q.moduleCode} for Q${q.order}`);
      continue;
    }

    // Find existing by version + order
    const existing = await prisma.question.findFirst({
      where: { versionId: version.id, order: q.order },
    });

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          stage: q.stage,
          content: q.content,
          isReverseScored: q.isReverseScored,
          moduleId,
          scoreValues: q.scoreValues,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.question.create({
        data: {
          versionId: version.id,
          order: q.order,
          stage: q.stage,
          content: q.content,
          isReverseScored: q.isReverseScored,
          moduleId,
          scoreValues: q.scoreValues,
          isActive: true,
        },
      });
      created++;
    }
  }

  console.log(`\n  ✅ Questions: ${created} created, ${updated} updated (total: ${QUESTIONS.length})`);

  // 6. Also seed score thresholds
  const thresholds = [
    { level: "强", minValue: 73, maxValue: 100 },
    { level: "中", minValue: 51, maxValue: 72 },
    { level: "弱", minValue: 0, maxValue: 50 },
  ];
  for (const t of thresholds) {
    await prisma.scoreThreshold.upsert({
      where: { id: `threshold_${t.level}` },
      create: { id: `threshold_${t.level}`, level: t.level, minValue: t.minValue, maxValue: t.maxValue },
      update: { minValue: t.minValue, maxValue: t.maxValue },
    });
  }
  console.log(`  ✅ Score thresholds: 强(66-100), 中(40-65), 弱(0-39)`);

  console.log("\n🎉 Seed complete!");
  await prisma.$disconnect();
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });

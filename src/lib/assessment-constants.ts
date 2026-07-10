// Assessment stage definitions (PRD §4)
export const STAGES = [
  {
    id: 1,
    name: "学习动力",
    description: "第一阶段：了解孩子为什么而学。",
    completedFeedback:
      "第一阶段完成，我们已经初步了解孩子的学习动力状态。",
    questionRange: [1, 20],
  },
  {
    id: 2,
    name: "学习能力",
    description: "第二阶段：了解孩子如何学习。",
    completedFeedback:
      "第二阶段完成，孩子的学习方式正在逐渐清晰。",
    questionRange: [21, 44],
  },
  {
    id: 3,
    name: "学习毅力",
    description: "第三阶段：了解孩子如何持续成长。",
    completedFeedback:
      "测评完成。请完成邮箱注册，保存成长档案并获得成长画像。",
    questionRange: [45, 66],
  },
] as const;

export const TOTAL_QUESTIONS = 66;
export const QUESTIONS_PER_STAGE = [20, 24, 22]; // Stage 1: 20, Stage 2: 24, Stage 3: 22

// 5 answer options per XLSX (PRD §4)
export const ANSWER_OPTIONS = [
  { value: "ALWAYS", label: "总是" },
  { value: "OFTEN", label: "经常" },
  { value: "SOMETIMES", label: "偶尔" },
  { value: "RARELY", label: "极少" },
  { value: "UNKNOWN", label: "不了解" },
] as const;

export type AnswerValue = (typeof ANSWER_OPTIONS)[number]["value"];

// Default scoring (normal questions): XLSX values
export const DEFAULT_SCORES: Record<string, number> = {
  ALWAYS: 100,
  OFTEN: 90,
  SOMETIMES: 30,
  RARELY: 0,
  UNKNOWN: 0,
};

// Reverse scoring (reverse-scored questions)
export const REVERSE_SCORES: Record<string, number> = {
  ALWAYS: 0,
  OFTEN: 30,
  SOMETIMES: 90,
  RARELY: 100,
  UNKNOWN: 0,
};

// Score thresholds: 弱≤50, 50<中≤72, 72<强≤100
export const SCORE_THRESHOLDS = {
  HIGH: 72, // score > 72 = 强
  LOW: 50,  // score ≤ 50 = 弱, 50<score≤72 = 中
} as const;

export type ScoreLevel = "强" | "中" | "弱";

export function getScoreLevel(score: number): ScoreLevel {
  if (score > SCORE_THRESHOLDS.HIGH) return "强";
  if (score <= SCORE_THRESHOLDS.LOW) return "弱";
  return "中";
}

// Get stage for a given question number (1-66)
export function getStage(questionNumber: number) {
  if (questionNumber <= 20) return STAGES[0];
  if (questionNumber <= 44) return STAGES[1];
  return STAGES[2];
}

// 66 real questions from XLSX (PRD source of truth)
export const QUESTIONS: { id: number; content: string; isReverse: boolean }[] = [
  { id: 1, content: "孩子学任何东西都是懒洋洋的、无精打采；只要老师、家长没安排学习任务，他就肯定不会去学习", isReverse: true },
  { id: 2, content: "孩子很有主见，对自己的特点、喜好、优势、短板都挺了解的，自己的事一般都是自己做主，做决定很果断", isReverse: false },
  { id: 3, content: "孩子常抱怨\u201c为什么要学这些？\u201d\u201c学这个有什么用？\u201d；常说\u201c不喜欢xx科目\u201d，但问为什么不喜欢，他又说不出原因", isReverse: true },
  { id: 4, content: "孩子的日常活动很丰富，在学习之外，还经常尝试去做各种不同类型的事，和各种不同职业的人打交道，有自己敬佩/想成为的榜样人物", isReverse: false },
  { id: 5, content: "孩子经常兴高采烈地分享今天学了什么有趣的新知识", isReverse: false },
  { id: 6, content: "孩子有自己很喜欢做的事，经常长时间专注地沉迷其中（不限于学习，但不包括电子产品）", isReverse: false },
  { id: 7, content: "孩子对大多数事物都表现得缺乏热情，没有特别想要的东西，也没有特别想追求的生活", isReverse: true },
  { id: 8, content: "孩子好胜心很强，总说\u201c我要得第几名\u201d\u201c我要赢过谁谁谁\u201d，会跟人比赛写作业等", isReverse: false },
  { id: 9, content: "孩子能在任何场合大方、友好地对任何人表达：\u201c我的看法跟你不同\u201d\u201c我不喜欢这样\u201d\u201c这个我暂时不知道/不会\u201d和\u201c能不能麻烦你帮我做xxx\u201d", isReverse: false },
  { id: 10, content: "孩子倾向于全方位地自我否定，比如常说\u201c我天生就是笨\u201d\u201c我什么都干不好\u201d\u201c我没有任何优点\u201d或者\u201c我不配做xxx\u201d", isReverse: true },
  { id: 11, content: "面对任何挑战性的任务（如参加体育或艺术比赛、挑战难题、出席人多的社交场合），孩子的第一反应不是\u201c试试看\u201d，而是很沮丧的\u201c我肯定不行\u201d", isReverse: true },
  { id: 12, content: "孩子成功时，会忽视自己的努力，归因于\u201c运气好、考得太简单\u201d等外部因素；失败时则会忽视可改进的点，归因于\u201c我没有数学天赋\u201d等内部因素", isReverse: true },
  { id: 13, content: "孩子在学习之外，还有很多\u201c做成一件事\u201d的体验（哪怕很小的事也可以，比如做家务）", isReverse: false },
  { id: 14, content: "孩子对上学表现出明显的排斥和焦虑，如经常表达不愿上学、要求请假，或在上学前出现头痛、腹痛、发烧、拉肚子等躯体化症状，去医院又查不出得了什么病", isReverse: true },
  { id: 15, content: "孩子在学校有很多好朋友，也常被老师表扬；遇到问题时，会主动寻求同学、老师、家人的帮助", isReverse: false },
  { id: 16, content: "孩子在磨蹭拖延时，问他\u201c为什么不想做？\u201d他能准确、具体地说明原因，如\u201c任务太多了\u201d\u201c我怕做不好被批评\u201d\u201c不知道从哪开始\u201d", isReverse: false },
  { id: 17, content: "孩子很容易适应新环境，会主动、或在父母的鼓励下很乐意地尝试新事物；喜欢和父母在一起、但不会粘人", isReverse: false },
  { id: 18, content: "孩子情绪容易失控、父母安抚也没用；或过分压抑自己，从不发脾气，表现出与年龄不符的\u201c懂事\u201d", isReverse: true },
  { id: 19, content: "孩子经常眉头紧锁、身体肌肉僵硬、动作拘谨而不放松舒展；在重要考试的前几天会睡不着或拉肚子、头痛，脾气变坏，总会说\u201c要是考不好怎么办？\u201d", isReverse: true },
  { id: 20, content: "孩子写作业需要三催四请，总是拖到最后一刻才不得不开始", isReverse: true },
  { id: 21, content: "孩子认认真真做了很多题、上了很多补习班，所有能用的时间都用在学习上了，但成绩就是不见提升", isReverse: true },
  { id: 22, content: "孩子对于某个学科是否需要预习，上课时哪些内容需要记笔记，哪些错题需要整理、整理后应该在什么时间以什么方式使用\u2026\u2026所有的学习动作都有明确的\u201c做还是不做\u201d\u201c怎么做\u201d\u201c要做到什么程度\u201d的标准", isReverse: false },
  { id: 23, content: "孩子经常立大而笼统的flag，如\u201c学好英语、提高语文\u201d，说不清为什么要立，也不会拆解成短期目标和小步骤，往往一两周后就不再提起；或孩子从未立过任何学习目标", isReverse: true },
  { id: 24, content: "孩子有学习策略，不是哪里差就多花点时间、或者喜欢哪科就学哪科，而是会将自己要提高的总分数有侧重地分配给各科、各模块，据此规划具体的学习任务", isReverse: false },
  { id: 25, content: "孩子会将时间精力集中到投入产出比最高、最重要的任务上，有时甚至会花80%的时间猛攻某个科目或模块", isReverse: false },
  { id: 26, content: "孩子每天会将各项任务安排在最能高效完成的时间点（如深度思考需要整段时间、背单词用碎片时间），按最高效的排序完成（如简单-中等-难循环）", isReverse: false },
  { id: 27, content: "孩子能较准确地估算完成一项任务所需时间，误差不超过20%，因此总能高效兼顾学习和其他活动，从不会手忙脚乱", isReverse: false },
  { id: 28, content: "孩子背诵课文、单词很快，读两遍就能背，一周、一个月之后提问仍然能回忆起大部分；从不机械地重复抄写、朗读，而是主动使用联想、画图、提取等技巧", isReverse: false },
  { id: 29, content: "孩子当天在学校学过的内容，可以用自己的话总结、表达出来，内容准确；学校布置的作业可以独立完成，准确率达到80%以上", isReverse: false },
  { id: 30, content: "孩子做事或解题时步骤清晰、有条理，常说\u201c第一步，第二步\u2026\u201d\u201c首先\u2026然后\u2026\u201d\u201c因为\u2026所以\u2026\u201d，会尝试不同的推理路径", isReverse: false },
  { id: 31, content: "孩子擅长归纳总结，如将琐碎知识分类、分层、提炼共性特点，将重要知识点/公式常用的解题技巧进行分类，复习时凭记忆绘制知识体系的思维导图\u2026\u2026", isReverse: false },
  { id: 32, content: "孩子会将有必要复习的错题根据错误难度、涉及的知识点和题目难度等各种维度进行分类，复习时有计划地按分类进行", isReverse: false },
  { id: 33, content: "很多知识孩子说自己学会了，过几天再碰到类似的题，只是换个情境、换个方式问，他就又不会了", isReverse: true },
  { id: 34, content: "孩子有出题人思维，能说出来每道题是要考察自己哪些知识点或技巧、通常会设置哪些陷阱", isReverse: false },
  { id: 35, content: "孩子喜欢研究一题多解，生活中也会为了解决问题从不同角度想出不同的方法", isReverse: false },
  { id: 36, content: "孩子能够将A学科（如数学的思维导图）的方法，迁移应用到B学科（如语文课文复习）或生活问题的解决中", isReverse: false },
  { id: 37, content: "听课没听懂时，能明确指出自己具体哪一步听不懂；提问时，能明确说出自己已经尝试了哪些思路、具体卡在哪里", isReverse: false },
  { id: 38, content: "孩子对于学习材料的难度是否适合自己，有很清晰的判断，常常会从不同的教辅里挑选部分难度略高于自己水平的题目来练习，甚至会忽略一部分学校作业，但成绩一直在进步或保持优秀水平", isReverse: false },
  { id: 39, content: "孩子对于自己是否\u201c学好了\u201d有明确、量化的标准（如对照各题型的评分标准），会准确地评估自己的掌握程度，比如\u201c这个知识点我理解不深、碰到复杂问题就不会用了\u201d\u201c这个技巧我还不够熟练，时间紧张的时候就容易错\u201d", isReverse: false },
  { id: 40, content: "孩子会长期、反复犯同一种类型的错误；也经常犯一些\u201c会但不准确\u201d的错误，如看错看漏题、抄错数字、算错、英语忘加s、ed等", isReverse: true },
  { id: 41, content: "孩子在分析自己的错误时，不会笼统地外部归因\u201c粗心了、题太难、外面太吵\u201d，而是会做具体、深入的内部归因，如：\u201c我不喜欢打草稿，跳步了所以算错，深层原因是大大低估了计算造成的失分量\u201d", isReverse: false },
  { id: 42, content: "孩子会根据自己的薄弱点，形成避免下次再犯类似错误的解决方法，并总结成程序：一套清晰、可执行的行动清单和流程", isReverse: false },
  { id: 43, content: "孩子会反复实践、验证和优化这个程序，直到彻底不再犯这类错误；当程序失效或遇到新问题时，也能快速修改程序", isReverse: false },
  { id: 44, content: "孩子会反复尝试和对比各种不同的学习方法，\u201c发明\u201d对自己来说最高效的方式", isReverse: false },
  { id: 45, content: "孩子每天睡眠充足，入睡容易，中途不易醒来，起床时很精神，常常不用闹钟就能自然醒", isReverse: false },
  { id: 46, content: "孩子平均每天运动（能明显感到心跳加速、微微出汗）时间不少于30分钟，在户外活动的时间（含运动）不少于1小时", isReverse: false },
  { id: 47, content: "孩子身体健康，很少生病或身体不适，每天按时吃饭，饮食均衡，不偏食、不暴食，喝水800mL以上", isReverse: false },
  { id: 48, content: "孩子热爱阅读，会主动找各种类型和主题的书来读", isReverse: false },
  { id: 49, content: "孩子做感兴趣的事情时，能持续30分钟以上完全专注，周围的事和声音很难打扰到他", isReverse: false },
  { id: 50, content: "孩子的学习环境凌乱，经常找不到学习用品", isReverse: true },
  { id: 51, content: "孩子能在不同任务间顺利切换（如写完数学后开始读语文），被突发事件打断后，也能较快地重新回到之前的学习任务上", isReverse: false },
  { id: 52, content: "孩子经常打扰别人的谈话或活动，问题还没有听完就开始抢答，在需要轮流进行的活动中常常无法耐心等待", isReverse: true },
  { id: 53, content: "孩子很容易冲动，经常忍不住去做一些事情，即使知道那样做是错的、或者对自己的健康有害，比如经常连续使用电子产品超过1.5小时、一直不停地吃零食等", isReverse: true },
  { id: 54, content: "做难度较大或数量较多的学习任务时，孩子经常自我鼓励，如\u201c我可以的\u201d\u201c我真厉害，这也能想到\u201d，或者给自己设置一些小奖励，如\u201c连对五题我就吃颗糖\u201d", isReverse: false },
  { id: 55, content: "孩子情绪不好时，能很快意识到，主动要求暂停手上的事，开始寻求帮助、安慰或自我疏导", isReverse: false },
  { id: 56, content: "孩子能明确识别自己的具体情绪，如表达\u201c我现在很委屈、沮丧、愤怒\u2026\u2026是因为我感到被忽视了\u201d", isReverse: false },
  { id: 57, content: "孩子心情不好或压力很大时，能以不伤害他人和自己的方式，自我疏导或释放，如记日记、自我对话、冥想、弹琴、画画、向家人和好友倾诉和寻求帮助等", isReverse: false },
  { id: 58, content: "孩子做事情时容易烦躁、发脾气，很久也不能静下心来冷静分析；考试时总会因为紧张、沮丧，无法回忆起平时已经很熟练的知识点，犯平时不会犯的错误", isReverse: true },
  { id: 59, content: "孩子是一个很乐观的人，不管遇到什么问题都习惯性地往好处想", isReverse: false },
  { id: 60, content: "孩子喜欢分享笑话、趣事，善于发现生活中的小美好、小确幸，比如记录自己的小进步，感恩身边的人、事、风景等", isReverse: false },
  { id: 61, content: "孩子常说\u201c努力有什么用，还不是比不过那些天生聪明的\u201d，羡慕那些成绩比自己好但爱玩的同学", isReverse: true },
  { id: 62, content: "听说别人的成功，孩子第一反应是沮丧、嫉妒，对他来说别人的成功意味着自己的失败", isReverse: true },
  { id: 63, content: "当被批评、失败时，孩子不会思考如何改进，而是会找各种借口辩解、逃避，或者说\u201c我天生就是笨\u201d", isReverse: true },
  { id: 64, content: "当一种方法行不通时，孩子不会钻牛角尖，而是马上尝试其他办法，或开始查资料、寻求帮助；有必要时甚至会有理有据地调整目标", isReverse: false },
  { id: 65, content: "孩子面对难题和连续的挫败、枯燥、耗时长的任务（如背单词、运动打卡）时，很快就会选择放弃，且再也不愿尝试", isReverse: true },
  { id: 66, content: "孩子面对挫折、失败时，会连续一两周陷入沮丧情绪中，难以恢复，并倾向于得到灾难性、永久化的结论，如\u201c我完了，我永远都不可能学好数学了\u201d\u201c我就是个笨蛋\u201d", isReverse: true },
];

// Backwards-compatible alias
export const PLACEHOLDER_QUESTIONS = QUESTIONS;

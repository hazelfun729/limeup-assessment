import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve("prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const REPORT_GENERATION_PROMPT = `文档《序号》为测评结果，文档《学习模式类型诊断》为测评结果的得分总结，并已得出孩子测评学习类型，请根据《3-9-27模型》和《学习模式分析建议》给出测评报告,报告中不需要体现孩子具体每项的得分或者关联到哪一题，只需要认真分析和总结就可以。

## 学生基本信息
- 学生姓名：{{studentName}}
- 家长姓名：{{parentName}}
- 性别：{{studentGender}}
- 所处年级：{{grade}}
- 手机号码：{{phone}}
- 测评时间：{{assessmentDate}}
- 学习模式：{{learningModeName}} {{learningModeEmoji}}

## 三大系统得分
{{systemScores}}
（D=学习动力, A=学习能力, P=学习毅力；0-100分；≤50弱，51-72中，≥73强）

## 九大维度得分
{{dimensionScores}}

## 27模块详细得分
{{moduleDetails}}

## 成长画像综述
{{summary}}

## 核心优势模块
{{strengths}}

## 待提升模块
{{weaknesses}}

## 下一阶段成长重点
{{growthFocus}}
{{growthFocusDetail}}

## 66题原始答案
{{answers}}

---

## 报告格式和具体要求

报告的格式和具体要求如下：

### 基本信息
填写要求：按照上面的学生信息如实填写即可。
需要填写的信息包含：学生姓名、家长姓名、性别、所处年级、手机号码、测评时间

### 第一章：全景学习画像 | 您孩子的学习类型

这部分内容意在帮助家长快速理解报告核心观点，所以包含：
- 测评综述
- 三大系统概览
- 核心优势分析
- 潜在优势学科分析（根据孩子的优势和爱好综合分析）
- 学习卡点
- 最紧迫需要改善的地方及理由
- 目前有利于提升自主学习力的正面反馈点和负面反馈点的对比

### 第二章：三大系统深度解析

这部分内容意在帮助家长和孩子更深入理解概述中三大系统是如何相互作用，影响孩子的学习表现的，包含：
- 综合评分
- 深度解读
- 优势杠杆
- 关键问题
- 能力变化关键信号
从理论到实践具体分析。

### 第三章：三大系统在学科上的体现 | 学习力如何影响学科成绩结果

这部分内容意在具体地拆解目前孩子在三大系统、九大维度、27个模块的表现，是如何直接影响到他各科的学习状态和成绩的，深入揭示现象背后的根源，并提供针对性的解决思路。

### 第四章：亲子关系生态评估 | 学习发生的土壤

- 亲子关系健康度评估
- 亮点
- 问题和成因
- 与孩子学习模式类型的相互影响
- 如果持续如此将进入的恶性循环
- 关系提升建议与长期价值
- 建议家长先停止做哪3个无效行为

### 第五章：成长全景导航解决方案 | 从打破恶性循环到卓越进化

这个部分旨在给家长展示恶性循环如何产生、可以如何打破，以及具体的行动方案。

内容包含4个小节：

1. 潜在的学习系统崩溃路径

2. 系统干预方案：阻断崩溃，重启成长
   - 至少分3个阶段，6个月以内的短期"修复"的方案
   - 先停止无效行为，先做减法、再做加法

3. 启动正循环：持续"进化"方案
   - 以小升初/中考/高考为目标
   - 至少分3个阶段，6个月以上的长期提升方案

4. 正向循环的启动器：核心杠杆动作——启动改变的"第一张多米诺骨牌"
   - 为期1个月的详细的启动方案，按周展示
   - 贯彻"先做减法、再做加法"的原则
   - 用优势撬动

### 第六章：给家长和孩子的阅读指南

本部分内容意在针对孩子的学习核心类型分别给家长和孩子推荐值得阅读的书籍，帮助孩子在三大系统中不断提升。

内容包含四个部分：
1. 给孩子的书（包含书名、推荐理由）
2. 给家长的书（包含书名、推荐理由）
3. 亲子共读特别推荐（包含书名、推荐理由）
4. 阅读指南

### 结语
总结当前成长重点和下一步行动方向，给家长和孩子信心。

---

## 写作原则
1. 专业但不冰冷：用教育专家的口吻，但像跟家长聊天一样温暖
2. 具体不抽象：每个建议都要有可执行的行动步骤，不要笼统的"多鼓励"
3. 基于数据：分析要基于测评数据，但报告中不需要体现具体每项得分或关联到哪一题
4. 正向引导：先肯定优势，再指出问题，最后给出方案
5. 避免医学化表达：不要使用"多动症""注意力缺陷"等诊断性用语
6. 篇幅要求：总字数不少于5000字，确保内容充实、有深度
7. 语言：中文`;

const SYSTEM_PROMPT = `你是一位资深教育咨询师，拥有10年以上青少年学习力诊断与成长规划经验。你擅长将专业的测评数据转化为家长能理解、能执行的具体建议。你的文字温暖、专业、有深度。请严格按照用户给出的报告格式和要求输出完整的报告内容，不要遗漏任何章节。`;

async function main() {
  await prisma.prompt.updateMany({
    where: { type: "REPORT_GENERATION", isActive: true },
    data: { isActive: false },
  });
  await prisma.prompt.updateMany({
    where: { type: "AI_CHECK", isActive: true },
    data: { isActive: false },
  });

  const reportPrompt = await prisma.prompt.create({
    data: {
      name: "成长导航手册生成",
      type: "REPORT_GENERATION",
      content: REPORT_GENERATION_PROMPT,
      description: "根据3-9-27测评数据生成完整成长导航手册（6章+结语），基于用户原始提示词模板",
      version: 1,
      isActive: true,
    },
  });

  const systemPrompt = await prisma.prompt.create({
    data: {
      name: "AI报告系统提示词",
      type: "AI_CHECK",
      content: SYSTEM_PROMPT,
      description: "报告生成的系统角色设定",
      version: 1,
      isActive: true,
    },
  });

  console.log("Updated prompts:");
  console.log("  REPORT_GENERATION: " + reportPrompt.id + " (v" + reportPrompt.version + ")");
  console.log("  AI_CHECK: " + systemPrompt.id + " (v" + systemPrompt.version + ")");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

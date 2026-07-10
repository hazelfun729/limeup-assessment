/**
 * Seed script: Report Generation Prompt Template
 * Usage: npx tsx prisma/seed/seed-prompt.ts
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createPrismaClient() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const REPORT_GENERATION_PROMPT = `请根据以下孩子的自主学习力测评数据，撰写一份完整的「成长导航手册」。

## 学生基本信息
- 学生姓名：{{studentName}}
- 家长姓名：{{parentName}}
- 性别：{{studentGender}}
- 年级：{{grade}}
- 测评日期：{{assessmentDate}}
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

## 输出要求

请输出一份完整的 HTML 格式成长导航手册，包含以下章节（用 h2/h3/p/ul/li/strong 等 HTML 标签）：

### 第一章：基本信息
简要列出学生姓名、年级、性别、测评日期、学习模式。

### 第二章：全景学习画像
- 学习模式解读（用动物类型的特点来形象描述孩子的学习风格）
- 测评综述（整体表现概述，200字以内）
- 三大系统概览（D/A/P各系统的表现和关系）
- 核心优势（3个最强模块，每个配具体说明和案例）
- 学习卡点（3个最弱模块，分析根本原因）
- 下一阶段成长重点

### 第三章：学习动力深度解析（D系统）
- 综合分析（动机、热情、自我认知等维度的得分解读）
- 优势杠杆（动力方面的突出表现）
- 关键问题（阻碍动力的核心因素）
- 变化信号（家长可观察的行为指标）

### 第四章：学习能力深度解析（A系统）
- 综合分析（方法、规划、记忆、思维等维度）
- 优势杠杆
- 关键问题
- 变化信号

### 第五章：学习毅力深度解析（P系统）
- 综合分析（体能、专注、自律、情绪、成长型思维等维度）
- 优势杠杆
- 关键问题
- 变化信号

### 第六章：学习力在学科上的体现
分析三大系统如何影响语文、数学、英语等主要学科的学习状态和成绩表现。结合具体模块得分给出学科建议。

### 第七章：亲子关系生态评估
分析亲子关系作为"学习土壤"对孩子当前学习模式的影响。指出家长可能正在做的无效行为（如过度干预、否定、比较等），给出具体改善建议。

### 第八章：成长全景导航方案
- 短期修复方案（2-4周可见效的具体行动）
- 长期进化方案（3-6个月的系统性提升路径）
- 核心杠杆动作（1-2个投入产出比最高的关键行为改变）
- 1个月启动计划（按周拆分的具体任务清单）

### 第九章：阅读指南
推荐适合孩子当前学习模式的书籍，分别给家长和孩子各推荐3-5本，说明推荐理由和阅读方法。

### 结语
总结当前成长重点和下一步行动方向，给家长和孩子信心。

---

## 写作原则
1. 专业但不冰冷：用教育专家的口吻，但像跟家长聊天一样温暖
2. 具体不抽象：每个建议都要有可执行的行动步骤，不要笼统的"多鼓励"
3. 基于数据：每个结论都要引用具体的测评得分或题目答案作为依据
4. 正向引导：先肯定优势，再指出问题，最后给出方案
5. 避免医学化表达：不要使用"多动症""注意力缺陷"等诊断性用语
6. 篇幅要求：总字数不少于5000字，确保内容充实、有深度
7. 语言：中文
`;

const SYSTEM_PROMPT = "你是一位资深教育咨询师，拥有10年以上青少年学习力诊断与成长规划经验。你擅长将专业的测评数据转化为家长能理解、能执行的具体建议。你的文字温暖、专业、有深度。";

async function main() {
  // Check existing
  const existing = await prisma.prompt.findFirst({
    where: { type: "REPORT_GENERATION", name: "成长导航手册生成" },
  });

  if (existing) {
    // Create new version
    const newVersion = existing.version + 1;
    // Deactivate old versions
    await prisma.prompt.updateMany({
      where: { type: "REPORT_GENERATION", name: "成长导航手册生成" },
      data: { isActive: false },
    });
    const prompt = await prisma.prompt.create({
      data: {
        name: "成长导航手册生成",
        type: "REPORT_GENERATION",
        content: REPORT_GENERATION_PROMPT,
        version: newVersion,
        isActive: true,
        description: "根据66题测评数据自动生成完整的成长导航手册（HTML格式）",
      },
    });
    console.log(`Prompt updated to v${newVersion}: ${prompt.id}`);
  } else {
    const prompt = await prisma.prompt.create({
      data: {
        name: "成长导航手册生成",
        type: "REPORT_GENERATION",
        content: REPORT_GENERATION_PROMPT,
        version: 1,
        isActive: true,
        description: "根据66题测评数据自动生成完整的成长导航手册（HTML格式）",
      },
    });
    console.log(`Prompt created: ${prompt.id}, v${prompt.version}`);
  }

  // Also seed the system prompt as a separate entry
  const existingAI = await prisma.prompt.findFirst({
    where: { type: "AI_CHECK", name: "AI报告质量检查" },
  });

  if (!existingAI) {
    await prisma.prompt.create({
      data: {
        name: "AI报告质量检查",
        type: "AI_CHECK",
        content: SYSTEM_PROMPT,
        version: 1,
        isActive: true,
        description: "系统提示词，用于报告生成和AI辅助修改",
      },
    });
    console.log("AI Check prompt created");
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

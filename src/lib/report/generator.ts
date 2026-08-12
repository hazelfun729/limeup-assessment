/**
 * Report Generation Service
 * Generates Growth Handbook (成长导航手册) using DeepSeek API
 */
import { prisma } from "@/lib/prisma";
import { STAGES } from "@/lib/assessment-constants";
import { marked } from "marked";

const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "deepseek-reasoner";

/**
 * Strip code fences that LLMs sometimes wrap around their HTML output.
 * e.g. ```html\n<h2>...</h2>\n``` → <h2>...</h2>
 */
function stripCodeFences(text: string): string {
  let result = text.trim();
  // Remove ```html ... ``` or ``` ... ``` wrappers (handles both top-level and embedded fences)
  const fenceMatch = result.match(/```(?:html|HTML|Html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    result = fenceMatch[1].trim();
  }
  return result;
}

/**
 * Convert markdown text to HTML
 */
function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/**
 * Build the full context data for a given assessment
 */
async function buildContext(assessmentId: string) {
  // Load assessment with all related data
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: { select: { email: true } },
      answerRecords: {
        include: {
          question: {
            include: {
              module: {
                include: {
                  dimension: { include: { system: true } },
                },
              },
            },
          },
        },
        orderBy: { question: { order: "asc" } },
      },
      growthProfile: true,
    },
  });

  if (!assessment) throw new Error("测评不存在");
  if (!assessment.growthProfile) throw new Error("成长画像不存在，请先生成画像");

  const profile = assessment.growthProfile;
  const systemScores = profile.systemScores as Record<string, number>;
  const dimensionScores = profile.dimensionScores as Record<string, number>;
  const moduleScores = profile.moduleScores as Record<string, number>;

  // Build answer table: { questionOrder: { content, answer, score, module, dimension, system, isReverse } }
  const answers = assessment.answerRecords.map((a) => ({
    order: a.question.order,
    content: a.question.content,
    answer: a.answer,
    score: a.score,
    isReverse: a.question.isReverseScored,
    module: a.question.module.name,
    moduleCode: a.question.module.code,
    dimension: a.question.module.dimension.name,
    dimensionCode: a.question.module.dimension.code,
    system: a.question.module.dimension.system.name,
    systemCode: a.question.module.dimension.system.code,
  }));

  // Group module scores by system and dimension
  const moduleDetails: Record<string, { name: string; score: number; dimension: string; system: string }> = {};
  for (const a of assessment.answerRecords) {
    const code = a.question.module.code;
    if (!moduleDetails[code]) {
      moduleDetails[code] = {
        name: a.question.module.name,
        score: moduleScores[code] || 0,
        dimension: a.question.module.dimension.name,
        system: a.question.module.dimension.system.name,
      };
    }
  }

  return {
    // Student info
    studentName: assessment.studentName || "学生",
    parentName: assessment.parentName || "家长",
    studentGender: assessment.studentGender || "未知",
    grade: assessment.grade || "未知",
    phone: assessment.phone || "",
    email: assessment.user?.email || "",
    assessmentDate: assessment.startedAt?.toISOString().slice(0, 10) || "",

    // Scores
    systemScores,
    dimensionScores,
    moduleScores,
    moduleDetails,

    // Profile
    learningMode: profile.learningMode,
    learningModeName: profile.learningModeName || profile.learningMode,
    learningModeEmoji: profile.learningModeEmoji || "",
    strengths: profile.strengths as Array<{ code: string; score: number }> || [],
    weaknesses: profile.weaknesses as Array<{ code: string; score: number }> || [],
    growthFocus: profile.growthFocus || "",
    growthFocusDetail: profile.growthFocusDetail || "",
    summary: profile.summary || "",

    // Answers
    answers,
  };
}

/**
 * Render the prompt template with context data
 */
function renderPrompt(template: string, ctx: Awaited<ReturnType<typeof buildContext>>): string {
  let rendered = template;

  // Replace simple variables
  const simpleVars: Record<string, string> = {
    studentName: ctx.studentName,
    parentName: ctx.parentName,
    studentGender: ctx.studentGender,
    grade: ctx.grade,
    phone: ctx.phone,
    email: ctx.email,
    assessmentDate: ctx.assessmentDate,
    learningMode: ctx.learningMode,
    learningModeName: ctx.learningModeName,
    learningModeEmoji: ctx.learningModeEmoji,
    growthFocus: ctx.growthFocus,
    growthFocusDetail: ctx.growthFocusDetail,
    summary: ctx.summary,
  };

  for (const [key, value] of Object.entries(simpleVars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  // Replace JSON variables — format as readable text instead of raw JSON
  // Format system scores
  const sysLines = Object.entries(ctx.systemScores as Record<string, number>)
    .map(([code, score]) => {
      const name = code === "D" ? "学习动力" : code === "A" ? "学习能力" : code === "P" ? "学习毅力" : code;
      return `  ${code}（${name}）：${score}分`;
    });
  rendered = rendered.replace(/\{\{systemScores\}\}/g, sysLines.join("\n"));
    const dimLines = Object.entries(ctx.dimensionScores as Record<string, number>)
    .map(([code, score]) => `  ${code}：${score}分`);
  rendered = rendered.replace(/\{\{dimensionScores\}\}/g, dimLines.join("\n"));
    const modLines = Object.entries(ctx.moduleScores as Record<string, number>)
    .map(([code, score]) => `  ${code}：${score}分`);
  rendered = rendered.replace(/\{\{moduleScores\}\}/g, modLines.join("\n"));
    const strLines = (ctx.strengths as Array<{ code: string; score: number }>)
    .map((s, i) => `  ${i + 1}. ${s.code}（${s.score}分）`);
  rendered = rendered.replace(/\{\{strengths\}\}/g, strLines.join("\n"));
    const weakLines = (ctx.weaknesses as Array<{ code: string; score: number }>)
    .map((w, i) => `  ${i + 1}. ${w.code}（${w.score}分）`);
  rendered = rendered.replace(/\{\{weaknesses\}\}/g, weakLines.join("\n"));

  // Build detailed module scores table
  const moduleTable = Object.entries(ctx.moduleDetails)
    .map(([code, m]) => `${m.system} > ${m.dimension} > ${m.name}(${code}): ${m.score}分`)
    .join("\n");
  rendered = rendered.replace(/\{\{moduleDetails\}\}/g, moduleTable);

  // Build answers summary
  const answersSummary = ctx.answers
    .map((a) => `Q${a.order}. [${a.system}>${a.dimension}>${a.module}] ${a.content}\n   答案: ${a.answer}(${a.score}分) ${a.isReverse ? "[反向题]" : ""}`)
    .join("\n");
  rendered = rendered.replace(/\{\{answers\}\}/g, answersSummary);

  return rendered;
}

/**
 * Call DeepSeek API to generate the handbook content
 */
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY 未配置。请在 .env 中设置 DeepSeek API Key。");
  }

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 20000,
      reasoning_effort: "high",
      thinking: { type: "enabled" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 错误 (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Main entry: generate a handbook for a given assessment
 */
export async function generateHandbook(assessmentId: string): Promise<{
  success: boolean;
  handbookId: string;
  contentHtml: string;
}> {
  // 1. Build context
  const ctx = await buildContext(assessmentId);

  // 2. Auto-select prompt based on student performance level
  // If 2+ systems are "强" → use 1型 (excellent→outstanding), otherwise → 2-27型 (breakthrough)
  const sysScoresRaw = ctx.systemScores as unknown as Record<string, { score: number; level: string }>;
  const strongCount = Object.values(sysScoresRaw).filter((s) => s.level === "强").length;
  const isExcellent = strongCount >= 2;

  let prompt;
  if (isExcellent) {
    // Try to find 1型 prompt first
    prompt = await prisma.prompt.findFirst({
      where: { isActive: true, type: "REPORT_GENERATION", name: { contains: "1型" } },
      orderBy: { version: "desc" },
    });
  }
  if (!prompt) {
    // Fall back to active prompt (2-27型)
    prompt = await prisma.prompt.findFirst({
      where: { isActive: true, type: "REPORT_GENERATION" },
      orderBy: { version: "desc" },
    });
  }

  if (!prompt) throw new Error("未找到报告生成 Prompt，请先在后台 Prompt 管理中创建模板。");

  // 3. Render prompt with data
  const userPrompt = renderPrompt(prompt.content, ctx);

  // Load system prompt from DB (AI_CHECK type)
  const sysPromptRecord = await prisma.prompt.findFirst({
    where: { isActive: true, type: "AI_CHECK" },
    orderBy: { version: "desc" },
  });
  const systemPrompt = sysPromptRecord?.content || "你是一位资深教育咨询师，擅长根据孩子的自主学习力测评数据撰写专业、温暖、可执行的成长导航手册。";

  // 4. Call AI
  const aiOutput = await callAI(systemPrompt, userPrompt);

  // 5. Strip code fences (LLMs sometimes wrap HTML in ```html ... ```) then convert markdown to HTML
  const cleanedOutput = stripCodeFences(aiOutput);
  const htmlContent = markdownToHtml(cleanedOutput);

  // 6. Save to handbook
  const existingHandbook = await prisma.growthHandbook.findUnique({
    where: { assessmentId },
  });

  const handbookData = {
    userId: ctx.email ? (await prisma.user.findUnique({ where: { email: ctx.email } }))?.id || assessmentId : assessmentId,
    assessmentId,
    status: "REVIEWING" as const,
    contentHtml: htmlContent,
    aiRawOutput: aiOutput,
    promptId: prompt.id,
    promptVersion: prompt.version,
    content: ctx.systemScores, // Save scores as structured data
  };

  let handbook;
  if (existingHandbook) {
    handbook = await prisma.growthHandbook.update({
      where: { assessmentId },
      data: {
        ...handbookData,
        version: existingHandbook.version + 1,
      },
    });
  } else {
    // Get userId from assessment
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment?.userId) throw new Error("用户未注册，无法生成手册");
    handbook = await prisma.growthHandbook.create({
      data: { ...handbookData, userId: assessment.userId },
    });
  }

  return {
    success: true,
    handbookId: handbook.id,
    contentHtml: aiOutput,
  };
}

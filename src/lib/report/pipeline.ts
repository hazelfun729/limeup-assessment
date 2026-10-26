import { randomUUID, createHash } from "node:crypto";
import { marked } from "marked";
import { prisma } from "@/lib/prisma";
import { loadReportReference, numericScores } from "@/lib/knowledge/reference";
import { cleanReportHtml } from "@/lib/security/report-html";
import { ANSWER_LABELS, REPORT_PROMPTS, REPORT_PRESENTATION_RULE, reportBranch } from "./v4-prompt";
import { splitChapters } from "./structure";

const json = (value: unknown) => JSON.parse(JSON.stringify(value));
export class ReportBusyError extends Error {}
// Supabase pooler round trips can exceed Prisma's 5-second interactive default.
const reportTransactionOptions = { maxWait: 10000, timeout: 30000 };

export async function prepareReport(assessmentId: string) {
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: {
    user: true, payment: true, growthProfile: true,
    questionVersion: { include: { questions: true } },
    answerRecords: { include: { question: { include: { module: { include: { dimension: { include: { system: true } } } } } } }, orderBy: { question: { order: "asc" } } },
  } });
  if (!a || a.status !== "COMPLETED" || !a.userId || !a.user?.emailVerified) throw new Error("测评须完成且用户邮箱已验证");
  if (a.payment?.status !== "CONFIRMED") throw new Error("请先确认付款");
  if (!a.growthProfile) throw new Error("成长画像缺失，请先核查历史结果，不能自动重算");
  const p = a.growthProfile;
  const reference = await loadReportReference(p.systemScores);
  const materials = JSON.parse(reference.text);
  const historical = a.source === "historical_import";
  const questions = a.questionVersion.questions;
  const answers = new Map(a.answerRecords.map(r => [r.questionId, r]));
  if (!questions.length || questions.some(q => !answers.has(q.id)) || a.answerRecords.length !== questions.length) throw new Error("答卷不完整，请先核查原始数据");
  const auditNotes: string[] = [];
  const grouped: Record<string, unknown[]> = {};
  for (const r of a.answerRecords) {
    const q = r.question;
    if (q.versionId !== a.questionVersionId || !ANSWER_LABELS[r.answer]) throw new Error("题目版本或选项无法识别，需人工核查");
    if (r.score != null && (!Number.isFinite(r.score) || r.score < 0 || r.score > 100)) throw new Error("保存分值超出范围");
    const configured = (q.scoreValues as Record<string, number>)[r.answer];
    if (!historical && r.answer !== "UNKNOWN" && (r.score == null || configured !== r.score)) throw new Error(`第${q.order}题保存分值与本版本不符，请核查`);
    if (historical && configured !== r.score) auditNotes.push(`Q${q.order}保留历史分值${r.score}，不套用后续计分表`);
    const group = `${q.module.dimension.system.name} / ${q.module.dimension.name} / ${q.module.name}`;
    (grouped[group] ||= []).push({题号:q.order,题干:q.content,实际回答:ANSWER_LABELS[r.answer],已保存得分:r.score,缺少观察:r.answer === "UNKNOWN"});
  }
  const prompts = await prisma.prompt.findMany({ where: { isActive: true, name: { in: [REPORT_PROMPTS.system, reportBranch(reference.combination)] } } });
  const system = prompts.find(p => p.name === REPORT_PROMPTS.system);
  const branch = prompts.find(p => p.name === reportBranch(reference.combination));
  if (!system || !branch) throw new Error("V4提示词尚未完整发布，请先发布共用与类型分支");
  const input = {
    学生:{姓名:a.studentName,测评时年级:a.grade,性别:a.studentGender,兴趣:a.interests || "未提供",测评日期:a.completedAt?.toISOString().slice(0,10)},
    已确定结果:{类型:p.learningModeName,组合:reference.combination,三系统:p.systemScores,九维度:p.dimensionScores,模块:p.moduleScores},
    体系定义:materials.taxonomy,匹配类型完整资料:materials.interpretation,按模块组织的实际答卷:grouped,
  };
  const user = JSON.stringify(input) + (a.id === "hist_017" ? '\n本次完整六章正文约7500—8000字，以保留关键分析和可执行建议为前提。' : '');
  const messages = [{role:"system",content:system.content + '\n\n' + branch.content + '\n\n' + REPORT_PRESENTATION_RULE},{role:"user",content:user}];
  const snapshot = {studentName:a.studentName,parentName:a.parentName,grade:a.grade,gender:a.studentGender,phone:a.phone,
    assessmentDate:a.completedAt?.toISOString().slice(0,10),animal:p.learningModeName,combination:reference.combination,
    typeNumber:materials.interpretation.number,bottleneck:materials.interpretation.bottleneck,
    strategies:materials.interpretation.strategies,systemScores:numericScores(p.systemScores)};
  return {a,branch,system,messages,snapshot,reference,auditNotes,scoringVersion:{questionVersionId:a.questionVersionId,version:a.questionVersion.version,description:a.questionVersion.description,source:historical?"historical_saved":"versioned_saved"}};
}

export async function generateHandbook(assessmentId: string) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY 未配置");
  const ctx = await prepareReport(assessmentId);
  const model = process.env.AI_MODEL || "deepseek-flash";
  const runId = randomUUID(), runKey = `report:run:${assessmentId}:${runId}`, lockKey = `report:lock:${assessmentId}`;
  const started = Date.now();
  const inputHash = createHash("sha256").update(JSON.stringify({messages:ctx.messages,model})).digest("hex");
  const audit: Record<string, unknown> = {runId,assessmentId,state:"RUNNING",startedAt:new Date().toISOString(),model,inputHash,
    prompts:[{id:ctx.system.id,version:ctx.system.version},{id:ctx.branch.id,version:ctx.branch.version}],
    messages:ctx.messages,knowledgeVersion:ctx.reference.version,scoringVersion:ctx.scoringVersion,notes:ctx.auditNotes};
  let old: Awaited<ReturnType<typeof prisma.growthHandbook.findUnique>>;
  try { old = await prisma.$transaction(async tx => {
    // A DB lease prevents duplicate paid calls across tabs and server processes.
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${lockKey})) AS acquired`;
    if (!lock?.acquired) throw new ReportBusyError("此报告正在生成，请勿重复操作");
    const lease = await tx.siteConfig.findUnique({where:{key:lockKey}});
    if (lease && JSON.parse(lease.value).expiresAt > Date.now()) throw new ReportBusyError("此报告正在生成，请勿重复操作");
    await tx.siteConfig.upsert({where:{key:lockKey},create:{key:lockKey,value:JSON.stringify({runId,expiresAt:started+25*60_000})},update:{value:JSON.stringify({runId,expiresAt:started+25*60_000})}});
    const previous = await tx.growthHandbook.findUnique({where:{assessmentId}});
    if (previous?.status === "SENDING") throw new ReportBusyError("报告邮件正在发送或结果待核实，请先处理投递状态");
    // The previous report remains in GrowthHandbook until replacement succeeds.
    // Avoid copying its full HTML/raw response into the audit record.
    audit.previous = previous ? {version:previous.version,status:previous.status,hadContent:!!previous.contentHtml} : null;
    await tx.siteConfig.create({data:{key:runKey,value:JSON.stringify(audit)}});
    await tx.growthHandbook.upsert({where:{assessmentId},create:{assessmentId,userId:ctx.a.userId!,status:"ANALYZING"},update:{status:"ANALYZING"}});
    return previous;
  }, reportTransactionOptions); }
  catch (error) {
    if (error instanceof ReportBusyError) throw error;
    if (error instanceof Error && /expired transaction|P2028|timed out/i.test(error.message)) {
      throw new Error("数据库准备报告超时；DeepSeek 尚未调用，请稍后重试");
    }
    throw error;
  }
  try {
    const response = await fetch(`${(process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/$/,"")}/chat/completions`,{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
      body:JSON.stringify({model,messages:ctx.messages,max_tokens:32768,thinking:{type:"enabled"},reasoning_effort:"high",stream:false}),
      // Netlify background functions stop after 15 minutes; leave time for validation and saving.
      signal:AbortSignal.timeout(10*60_000),
    });
    const raw = await response.text();
    if (raw.includes(key)) throw new Error("接口响应含敏感字段，已停止保存");
    audit.httpStatus = response.status; audit.rawResponse = raw; audit.elapsedMs = Date.now()-started;
    await prisma.siteConfig.update({where:{key:runKey},data:{value:JSON.stringify(audit)}});
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}，原始错误已保留在后台记录`);
    const result = JSON.parse(raw);
    audit.usage=result.usage; audit.returnedModel=result.model; audit.providerId=result.id;
    const choice=result.choices?.[0]; audit.finishReason=choice?.finish_reason;
    if (choice?.finish_reason !== "stop" || !choice.message?.content?.trim()) throw new Error("模型返回截断或正文为空，未发布");
    const output: string = choice.message.content;
    const cleaned=output.replace(/^```(?:markdown|md)?\s*\n/,"").replace(/\n```\s*$/,"");
    const contentHtml=cleanReportHtml(await marked.parse(cleaned));
    const chapters=splitChapters(contentHtml);
    if (chapters.length !== 6 || chapters.some((s,i)=>s.number!==i+1 || s.html.replace(/<[^>]*>/g,"").trim().length<30)) throw new Error("返回内容未形成完整六章，原始结果已保留供审核");
    const plain=contentHtml.replace(/<[^>]+>/g,"");
    if (/\d+(?:\.\d+)?\s*分(?!钟)|张力分析|待核对事项/.test(plain)) throw new Error("正文出现分数或内部核对内容，需人工审核；未自动重试");
    audit.state="SUCCEEDED";audit.completedAt=new Date().toISOString();audit.bodyCharacters=plain.replace(/\s/g,"").length;
    const handbook=await prisma.$transaction(async tx=>{
      const lease=await tx.siteConfig.findUnique({where:{key:lockKey}});
      if(!lease || JSON.parse(lease.value).runId!==runId) throw new Error("生成锁已失效，结果仅保留审核记录");
      const saved=await tx.growthHandbook.update({where:{assessmentId},data:{status:"REVIEWING",contentHtml,aiRawOutput:output,promptId:ctx.branch.id,promptVersion:ctx.branch.version,
        version:old?.contentHtml?(old.version+1):(old?.version||1),reviewedAt:null,reviewedBy:null,
        content:json({reportSchema:"lime-v4",snapshot:ctx.snapshot,chapters,generatedAt:audit.completedAt,runId,referenceVersion:ctx.reference.version,scoringVersion:ctx.scoringVersion,
          generation:{model:result.model,usage:result.usage,elapsedMs:audit.elapsedMs,promptVersion:ctx.branch.version,systemPromptVersion:ctx.system.version,bodyCharacters:audit.bodyCharacters}})}});
      await tx.siteConfig.update({where:{key:runKey},data:{value:JSON.stringify(audit)}});
      await tx.siteConfig.delete({where:{key:lockKey}});return saved;
    }, reportTransactionOptions);
    return {success:true,handbookId:handbook.id,contentHtml};
  } catch(error) {
    audit.state="FAILED"; audit.elapsedMs=Date.now()-started; audit.completedAt=new Date().toISOString();
    audit.error=(error instanceof Error?error.message:"生成失败").replaceAll(key,"[REDACTED]");
    try { await prisma.$transaction(async tx=>{
      await tx.siteConfig.update({where:{key:runKey},data:{value:JSON.stringify(audit)}});
      const lease=await tx.siteConfig.findUnique({where:{key:lockKey}});
      if (lease && JSON.parse(lease.value).runId===runId) {
        await tx.siteConfig.delete({where:{key:lockKey}});
        await tx.growthHandbook.update({where:{assessmentId},data:{status:old?.contentHtml?old.status:"FAILED"}});
      }
    }, reportTransactionOptions); }
    catch (cleanupError) { console.error("Report failure cleanup also failed:", cleanupError); }
    throw new Error(String(audit.error));
  }
}

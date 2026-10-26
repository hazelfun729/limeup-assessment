import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/mail/delivery";
import { cleanReportHtml } from "@/lib/security/report-html";
import { splitChapters } from "./structure";

export const REPORT_ENDING = '根据本次测评，进入成长地图，就可以立即和孩子一起选择适合自己的行动方式，开始第一个成长目标和本周行动，把“应该改变”变成“我准备这样做”。';
export const escapeHtml = (value: unknown) => String(value ?? "未填写").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
type Snapshot = {studentName?:string;parentName?:string;grade?:string;gender?:string;phone?:string;assessmentDate?:string;animal?:string;bottleneck?:string;strategies?:string[]};

// Email clients frequently drop <style>, CSS grid, print rules and data: images.
// Keep the message self-contained with inline styles and a related MIME image.
function emailProse(html: string) {
  const styles: Record<string,string> = {
    p:'margin:0 0 16px;color:#44483e;font-size:16px;line-height:1.85',
    h3:'margin:30px 0 12px;color:#252722;font-size:21px;line-height:1.5',
    h4:'margin:24px 0 10px;color:#252722;font-size:17px;line-height:1.5',
    ul:'margin:12px 0 22px;padding-left:24px',ol:'margin:12px 0 22px;padding-left:24px',
    li:'margin:0 0 9px;color:#44483e;font-size:16px;line-height:1.85',
    table:'width:100%;border-collapse:collapse;margin:20px 0 28px;table-layout:fixed;font-size:14px;line-height:1.7',
    th:'background:#f4f5df;text-align:left;font-weight:600;border-top:2px solid #dbdd4f;border-bottom:1px solid #e3e4da;padding:12px 10px;vertical-align:top;overflow-wrap:anywhere',
    td:'border-bottom:1px solid #e3e4da;padding:12px 10px;vertical-align:top;overflow-wrap:anywhere',
    blockquote:'margin:20px 0;padding:18px 22px;border-left:3px solid #dbdd4f;background:#f7f7f0',
    hr:'border:0;border-top:1px solid #e3e4da;margin:28px 0',
    strong:'color:#252722;font-weight:600',
  };
  return html.replace(/<(p|h3|h4|ul|ol|li|table|th|td|blockquote|hr|strong)\b([^>]*)>/gi,
    (_match, tag: string, attributes: string) => `<${tag}${attributes} style="${styles[tag.toLowerCase()]}">`);
}

function renderEmailLayout(s: Snapshot, chapters: ReturnType<typeof splitChapters>, body: string, date: string, number: string, isV4: boolean, reportUrl?: string) {
  const e=escapeHtml;
  const info=[['学生姓名',s.studentName],['家长姓名',s.parentName],['性别',s.gender],['测评时年级',s.grade?`${s.grade}年级`:undefined],['手机号码',s.phone],['测评时间',s.assessmentDate]];
  const paragraph='margin:0 0 16px;color:#44483e;font-size:16px;line-height:1.85';
  const eyebrow='margin:0 0 10px;color:#63682a;font-size:12px;letter-spacing:2px';
  const sectionTitle='margin:0 0 22px;color:#252722;font-size:27px;line-height:1.45;font-weight:600';
  const logo='<img src="cid:limeup-report-logo" width="190" alt="青柠伴学" style="display:block;width:190px;max-width:100%;height:auto;border:0">';
  const reportLink=reportUrl?`<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:26px 0 12px"><tr><td align="center" style="padding:0"><a href="${e(reportUrl)}" style="display:inline-block;background:#dbdd4f;border-radius:24px;padding:13px 25px;color:#252722;font-size:16px;font-weight:600;text-decoration:none">查看正式报告　→</a></td></tr></table><p style="margin:0 0 22px;color:#60635a;font-size:12px;line-height:1.7;text-align:center">在网页中阅读完整排版，也可使用章节目录跳转和打印 A4。</p>`:'';
  const details=info.map(([label,value])=>`<tr><td style="width:38%;padding:10px 8px;border-bottom:1px solid #e3e4da;color:#60635a;font-size:13px">${e(label)}</td><td style="padding:10px 8px;border-bottom:1px solid #e3e4da;color:#252722;font-size:13px">${e(value)}</td></tr>`).join('');
  const directory=chapters.length?`<div style="padding:25px 0 31px;border-bottom:1px solid #e3e4da"><p style="${eyebrow}">章节目录</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tbody>${chapters.map(chapter=>`<tr><td style="width:36px;padding:8px 0;color:#63682a;font-size:13px;vertical-align:top">0${chapter.number}</td><td style="padding:8px 0;font-size:15px;line-height:1.6"><a href="#chapter-${chapter.number}" style="color:#252722;text-decoration:none">${e(chapter.title.replace(/^第.章\s*/,''))}</a></td></tr>`).join('')}</tbody></table></div>`:'';
  const direction=s.strategies?.length?`<div style="padding:30px 0;border-top:1px solid #e3e4da"><p style="${eyebrow}">支持方向</p><h2 style="${sectionTitle}">${s.bottleneck?`先从${e(s.bottleneck)}找到支点`:'沿着已有的力量，继续探索'}</h2><p style="${paragraph}">下面是这一学习类型的支持方向。结合后文的个体分析，选择适合你们的一步。</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-top:2px solid #dbdd4f">${s.strategies.map((strategy,i)=>`<tr><td style="width:38px;padding:15px 4px 15px 0;border-bottom:1px solid #e3e4da;color:#63682a;font-size:12px;vertical-align:top">0${i+1}</td><td style="padding:15px 0;border-bottom:1px solid #e3e4da;color:#44483e;font-size:15px;line-height:1.8">${e(strategy.replace(/^\d+[.、]\s*/,''))}</td></tr>`).join('')}</table></div>`:'';
  const sections=chapters.length?chapters.map(chapter=>`<div id="chapter-${chapter.number}" style="padding:40px 0 22px;border-top:1px solid #e3e4da"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px"><tr><td style="width:74px;color:#63682a;font-family:Georgia,serif;font-size:54px;line-height:1;vertical-align:top">0${chapter.number}</td><td style="vertical-align:top"><p style="${eyebrow}">成长导航报告</p><h2 style="${sectionTitle};margin-bottom:0">${e(chapter.title.replace(/^第.章\s*/,''))}</h2></td></tr></table>${emailProse(chapter.html)}</div>`).join(''):`<div style="padding:30px 0;border-top:1px solid #e3e4da">${emailProse(body)}</div>`;
  const ending=isV4?`<div style="padding:30px 0 0;border-top:2px solid #dbdd4f"><p style="${eyebrow}">把理解带回生活</p><h2 style="${sectionTitle}">从你们愿意的一步开始。</h2><p style="${paragraph}">${REPORT_ENDING}</p><div style="border-top:1px solid #e3e4da;padding-top:20px;margin-top:28px"><h3 style="margin:0 0 12px;font-size:16px;color:#252722">关于这份报告</h3><p style="${paragraph}">本报告基于“青柠伴学”自主学习力诊断测评系统，结合家长的日常观察，从学习动力、学习能力、学习毅力三个维度对孩子进行初步评估。</p><p style="${paragraph}">报告旨在帮助家长理解孩子当前学习状态背后的原因，发现优势与潜力，并为后续支持提供方向参考。更细致的评估与个性化方案，需在对孩子的持续观察与互动中逐步完善。</p><p style="${paragraph}">请家长以开放、发展的心态阅读本报告，将其视为一份引导成长的“导航图”，而非定义孩子的“标签”。我们期待与您一起，陪伴孩子在探索中不断进步！</p></div></div>`:'';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(s.studentName)} · 成长导航报告</title></head><body style="margin:0;padding:0;background:#f1f2ec;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#252722"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f1f2ec"><tr><td align="center" style="padding:20px 10px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;border-collapse:collapse;background:#fff"><tr><td style="padding:58px 36px 48px;overflow-wrap:anywhere">${logo}<div style="width:56px;height:5px;background:#dbdd4f;margin:54px 0 22px"></div><p style="${eyebrow}">理解当下 · 支持成长</p><h1 style="margin:0;color:#252722;font-size:36px;line-height:1.45;font-weight:600">自主学习力诊断与<br><span style="border-bottom:5px solid #dbdd4f">成长导航报告</span></h1><p style="margin:44px 0 9px;color:#252722;font-size:24px">${e(s.studentName)} <span style="font-size:16px;color:#60635a">/ ${e(s.animal)}</span></p><p style="${paragraph}">读懂孩子的独特之处，找到适合你们的下一步。</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-top:1px solid #e3e4da;margin:32px 0 22px">${details}</table><p style="font-size:12px;line-height:1.8;color:#60635a">报告编号 ${e(number)}<br>报告填写日期 ${e(date)} · 个人专属，请妥善保存。</p>${reportLink}<div style="padding:14px 0;margin:42px 0 0;border-top:1px solid #e3e4da;border-bottom:1px solid #e3e4da;color:#60635a;font-size:13px">青柠伴学 · 成长导航报告</div>${directory}${direction}${sections}${ending}</td></tr></table></td></tr></table></body></html>`;
}

export async function loadReportDocument(id: string) {
  const handbook = await prisma.growthHandbook.findFirst({where:{OR:[{id},{assessmentId:id}]},include:{assessment:{include:{growthProfile:true}}}});
  return handbook;
}

export async function renderReportDocument(handbook: NonNullable<Awaited<ReturnType<typeof loadReportDocument>>>, download = false, email = false, emailReportUrl?: string, downloadHref?: string) {
  const content = handbook.content as {snapshot?:Snapshot;generatedAt?:string;reportSchema?:string} | null;
  const a=handbook.assessment, profile=a.growthProfile;
  const s:Snapshot=content?.snapshot || {studentName:a.studentName||undefined,parentName:a.parentName||undefined,grade:a.grade||undefined,gender:a.studentGender||undefined,phone:a.phone||undefined,assessmentDate:(a.completedAt||a.startedAt).toISOString().slice(0,10),animal:profile?.learningModeName||undefined};
  const e=escapeHtml;
  const body=cleanReportHtml(handbook.contentHtml);
  const chapters=splitChapters(body);
  const date=(content?.generatedAt||handbook.createdAt.toISOString()).slice(0,10);
  const number=`QNBX-${date.slice(2).replaceAll('-','')}-${s.phone||handbook.id.slice(-8)}`;
  if (email) return renderEmailLayout(s,chapters,body,date,number,content?.reportSchema==='lime-v4',emailReportUrl);
  const logo='data:image/png;base64,'+(await readFile(join(process.cwd(),'public/report-logo.png'))).toString('base64');
  const css=await readFile(join(process.cwd(),'src/lib/report/document.css'),'utf8');
  const brand=email?'<span class="logo" style="font-weight:700;color:#6a9b1e">青柠伴学</span>':`<span class="logo"><img src="${logo}" alt="青柠伴学"></span>`;
  const info=[['学生姓名',s.studentName],['家长姓名',s.parentName],['性别',s.gender],['测评时年级',s.grade?`${s.grade}年级`:undefined],['手机号码',s.phone],['测评时间',s.assessmentDate]];
  const cover=`<section class="cover"${email?' style="min-height:0;padding:32px 0 24px"':''}>${brand}<div class="cover-rule"></div><p class="eyebrow">理解当下 · 支持成长</p><h1>自主学习力诊断与<br><em>成长导航报告</em></h1><p class="person">${e(s.studentName)}<span> / ${e(s.animal)}</span></p><p class="cover-subtitle">读懂孩子的独特之处，找到适合你们的下一步。</p><dl class="info">${info.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><p class="fine">报告编号 ${e(number)}<br>报告填写日期 ${date} · 个人专属，请妥善保存。</p></section>`;
  const nav=chapters.length?`<nav aria-label="章节目录">${chapters.map(c=>`<a href="#chapter-${c.number}"><span>0${c.number}</span>${e(c.title.replace(/^第.章\s*/,''))}</a>`).join('')}</nav>`:'';
  // The support path uses the authoritative matched type, never the lowest score.
  const direction=s.strategies?.length?`<section class="intro"><p class="eyebrow">支持方向</p><h2>${s.bottleneck?`先从${e(s.bottleneck)}找到支点`:'沿着已有的力量，继续探索'}</h2><p>下面是这一学习类型的支持方向。结合后文的个体分析，选择适合你们的一步。</p><ol class="path">${s.strategies.map((x,i)=>`<li><span class="step">0${i+1}</span><p>${e(x.replace(/^\d+[.、]\s*/,''))}</p></li>`).join('')}</ol></section>`:'';
  const sections=chapters.length?chapters.map(c=>`<section class="chapter" id="chapter-${c.number}"><header class="chapter-heading"><span class="chapter-no">0${c.number}</span><div><p class="eyebrow">成长导航报告</p><h2>${e(c.title.replace(/^第.章\s*/,''))}</h2></div></header><div class="prose-report">${c.html}</div></section>`).join(''):`<section class="chapter prose-report">${body}</section>`;
  const ending=content?.reportSchema==='lime-v4'?`<section class="closing"><p class="eyebrow">把理解带回生活</p><h2>从你们愿意的一步开始。</h2><p>${REPORT_ENDING}</p><div class="explanation"><h3>关于这份报告</h3><p>本报告基于“青柠伴学”自主学习力诊断测评系统，结合家长的日常观察，从学习动力、学习能力、学习毅力三个维度对孩子进行初步评估。</p><p>报告旨在帮助家长理解孩子当前学习状态背后的原因，发现优势与潜力，并为后续支持提供方向参考。更细致的评估与个性化方案，需在对孩子的持续观察与互动中逐步完善。</p><p>请家长以开放、发展的心态阅读本报告，将其视为一份引导成长的“导航图”，而非定义孩子的“标签”。我们期待与您一起，陪伴孩子在探索中不断进步！</p></div></section>`:'';
  const toolbar=email?'':`<div class="toolbar"><span>青柠伴学 · 个人专属报告</span><div>${download?'':`<a href="${downloadHref || `/api/reports/${encodeURIComponent(handbook.id)}/document?download=1`}">下载 HTML</a>`}<button onclick="window.print()">打印 A4</button></div></div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(s.studentName)} · 成长导航报告</title><style>${css}${email?'@media screen{.cover{min-height:0}main{padding:0 24px 40px}.chapter{break-before:auto}}':''}</style></head><body>${toolbar}<main${email?' style="max-width:760px;margin:0 auto;padding:0 24px 40px;background:#fff;font-family:Arial,\'PingFang SC\',sans-serif;color:#20231c;line-height:1.8"':''}>${cover}<div class="body-brand">${brand}<span>成长导航报告</span></div>${email?'':nav}${direction}${sections}${ending}</main></body></html>`;
}

/** The complete approved report, without browser controls or local-only links. */
export async function renderReportEmail(handbook: NonNullable<Awaited<ReturnType<typeof loadReportDocument>>>, preview = false) {
  const site = publicSiteUrl();
  const path = `/report/${encodeURIComponent(handbook.id)}`;
  const reportUrl = preview ? path : site ? `${site}/login?redirect=${encodeURIComponent(path)}` : undefined;
  return renderReportDocument(handbook, false, true, reportUrl);
}

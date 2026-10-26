import { prisma } from "@/lib/prisma";
import { getProfileView } from "./service";
import {
  REPORT_PRICE,
  LETTER_QUESTIONS,
  CONSULTATION_INTRO,
  CONSULTATION_REPLY,
  CONSULTATION_CHOICE,
  REPORT_DELIVERABLES,
  scorePresentation,
  type ProfileView,
} from "./content";
import { escapeHtml as e, publicSiteUrl, deliver } from "@/lib/mail/delivery";
export function renderProfileEmail(p: ProfileView, origin: string) {
  // Hex equivalents of the website's existing OKLCH brand tokens for email clients.
  const bar = (name: string, score: number | null, modules?: string[]) => {
    const tone = scorePresentation(score);
    return `<div style="margin:20px 0"><p style="margin:0 0 10px;font-size:15px;line-height:1.8"><strong>${e(name)}</strong>${modules ? `<span style="color:#555552;font-size:13px">（${e(modules.join("、"))}）</span>` : ""}<span style="color:${tone.text};white-space:nowrap"> · ${score === null ? "信息不足" : score + "/100 · " + tone.level}</span></p>${score === null ? "" : `<div style="height:6px;background:#ededeb;border-radius:6px;overflow:hidden"><div style="height:6px;width:${Math.max(0, Math.min(100, score))}%;background:${tone.bar}"></div></div>`}</div>`;
  };
  const section =
    "margin-top:48px;padding-top:40px;border-top:1px solid #e8e8e5";
  return `<html lang="zh-CN"><body style="margin:0;background:#fafaf9;color:#0d0d0b;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;line-height:1.9"><main style="max-width:640px;margin:auto;padding:48px 24px">
  <header style="text-align:center;padding-bottom:32px"><p style="font-size:12px;letter-spacing:2px;color:#555552">青柠伴学 · 成长画像</p><h1 style="font-size:32px;font-weight:600;margin:28px 0 16px">${e(p.emoji)} ${e(p.copy.animal)}</h1><h2 style="font-size:22px;font-weight:500">${e(p.copy.title)}</h2></header>
  <section style="${section}"><h2 style="font-size:24px;font-weight:600">认识孩子，从理解开始</h2>${p.copy.paragraphs.map((t, i) => `<div style="margin-top:28px"><p style="margin:0 0 10px;font-size:13px;color:#555552">${["日常里的孩子", "这次测评看见的", "可以怎样支持"][i]}</p><p style="margin:0;font-size:16px;line-height:2">${e(t)}</p></div>`).join("")}</section>
  <section style="${section}"><h2 style="font-size:24px;font-weight:600">三大系统 · 九大维度</h2>${p.systems.map((s) => `<section style="margin-top:24px;border:1px solid #e8e8e5;border-radius:14px;overflow:hidden"><div style="padding:4px 20px;background:#f5f6e5"><p style="margin-bottom:0;font-size:12px;color:#555552">系统</p>${bar(s.name, s.score)}</div><div style="padding:4px 20px;background:#ffffff">${s.dimensions.map((d) => bar(d.name, d.score, d.modules)).join("")}</div></section>`).join("")}</section>
  <section style="margin-top:40px;padding:24px;background:#f1f1ed;border-radius:12px"><h2 style="margin-top:0;font-size:20px;font-weight:500">今天可以试试</h2><p style="margin-bottom:0">${e(p.copy.action)}</p></section>
  <section style="${section}"><h2 style="font-size:24px;font-weight:600">看完孩子的成长画像，如果还有想进一步了解的事，欢迎写信告诉我。</h2><p style="margin:24px 0;color:#555552">${CONSULTATION_INTRO}</p><ol style="padding-left:24px">${LETTER_QUESTIONS.map((q, i) => `<li style="margin-bottom:18px;padding-left:6px">${q}${i === 4 ? ' <span style="font-size:12px;color:#555552">（选填）</span>' : ""}</li>`).join("")}</ol><p style="margin-top:32px">${CONSULTATION_REPLY}</p><p style="font-size:14px;color:#555552">${CONSULTATION_CHOICE}</p><p style="font-size:14px">— 柚子老师</p><a style="display:inline-block;background:#dbdd4f;color:#0d0d0b;text-decoration:none;border-radius:24px;padding:12px 28px;margin-top:16px" href="${e(origin)}/consultation/${encodeURIComponent(p.assessmentId)}">写咨询信</a></section>
  <section style="${section}"><p style="font-size:12px;color:#555552">成长导航报告</p><h2 style="font-size:24px;font-weight:600">把理解，变成接下来的支持</h2><ul style="padding:0">${REPORT_DELIVERABLES.map((b) => `<li style="list-style:none;margin:16px 0;padding:20px;background:#ffffff;border:1px solid #e8e8e5;border-radius:12px"><strong>${e(b.title)}</strong><p style="margin:12px 0 8px">${e(b.question)}</p><p style="margin:0;font-size:14px;color:#555552">${e(b.detail)}</p></li>`).join("")}</ul>${!p.purchase.purchased ? `<p style="margin-top:32px"><strong style="font-size:28px;font-weight:500">¥${REPORT_PRICE.current}</strong> <span style="font-size:12px;color:#555552">原价 <del>¥${REPORT_PRICE.original}</del></span></p>` : ""}<a style="display:inline-block;border:1px solid #bdbdb8;color:#0d0d0b;text-decoration:none;border-radius:24px;padding:12px 24px" href="${e(origin + p.purchase.href)}">${e(p.purchase.label)}</a></section><p style="margin-top:48px;font-size:12px;color:#555552">这份画像来自本次观察，是理解孩子的起点，不是固定标签或医学诊断。</p></main></body></html>`;
}
export async function sendProfileEmail(assessmentId: string, retry = false) {
  const origin = publicSiteUrl();
  if (!origin) return { status: "LOCAL_PREVIEW" };
  const a = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { user: true },
  });
  if (!a?.user?.emailVerified || a.status !== "COMPLETED")
    return { status: "INELIGIBLE" };
  const id = `profile-${assessmentId}`;
  const existing = await prisma.delivery.findUnique({ where: { id } });
  if (existing && (!retry || !["FAILED", "PENDING"].includes(existing.status)))
    return existing;
  const p = await getProfileView(assessmentId);
  await prisma.delivery.createMany({
    data: [
      {
        id,
        kind: "PROFILE",
        userId: a.user.id,
        to: a.user.email,
        subject: "青柠伴学｜孩子的成长画像",
        html: renderProfileEmail(p, origin),
      },
    ],
    skipDuplicates: true,
  });
  return deliver(id);
}

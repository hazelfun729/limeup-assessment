import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin/auth";
import { getUserSession } from "@/lib/user/auth";
import { readSession } from "./session";

// Anonymous access is a secret capability, never the public record ID.
export async function assessmentAccess(id: string, allowGuest = true) {
  const assessment = await prisma.assessment.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
  if (!assessment) return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  if (await getAdminSession()) return null;
  const user = await getUserSession();
  if (user && user.id === assessment.userId) return null;
  if (allowGuest && !assessment.userId) {
    const guest = await readSession(`assessment_${id}`, "GUEST");
    if (guest?.subjectId === id) return null;
  }
  return NextResponse.json({ error: "请登录查看自己的测评，或从原浏览器继续" }, { status: 403 });
}

export async function completionError(id: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id }, include: { answerRecords: true, questionVersion: { include: { questions: { where: { isActive: true } } } } } });
  if (!assessment) return "测评不存在";
  const answers = new Map(assessment.answerRecords.map(a => [a.questionId, a.answer]));
  if (!assessment.questionVersion.questions.length || assessment.questionVersion.questions.some(q => !Object.hasOwn(q.scoreValues as object, answers.get(q.id) ?? ""))) return "请完成全部题目后再提交";
  for (const stage of [1, 2, 3]) {
    const items = assessment.questionVersion.questions.filter(q => q.stage === stage);
    if (items.length && items.every(q => answers.get(q.id) === "UNKNOWN")) return `第${stage}阶段全部选择了“不了解”，暂时无法形成画像，请补充可观察到的表现`;
  }
  return null;
}

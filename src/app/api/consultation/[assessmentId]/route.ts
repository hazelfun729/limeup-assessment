import { normalizeLetterAnswers } from "@/lib/profile/content";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";
async function context(assessmentId: string) {
  const user = await getUserSession();
  if (!user) return null;
  const a = await prisma.assessment.findFirst({
    where: { id: assessmentId, userId: user.id, status: "COMPLETED" },
  });
  return a ? user : null;
}
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params;
  const user = await context(assessmentId);
  if (!user)
    return NextResponse.json(
      { error: "请登录该测评所属的已验证账户" },
      { status: 403 },
    );
  const letter = await prisma.consultationLetter.findUnique({
    where: { assessmentId },
  });
  return NextResponse.json({
    email: user.email,
    letter: letter
      ? {
          id: letter.id,
          answers: letter.answers,
          status: letter.status,
          createdAt: letter.createdAt,
          sentAt: letter.sentAt,
        }
      : null,
  });
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params;
  const user = await context(assessmentId);
  if (!user)
    return NextResponse.json(
      { error: "请登录该测评所属的已验证账户" },
      { status: 403 },
    );
  const body = await r.json().catch(() => null);
  const answers = normalizeLetterAnswers(body?.answers);
  if (!answers)
    return NextResponse.json(
      { error: "请填写前四个问题，第五项选填，每项不超过4000字" },
      { status: 400 },
    );
  await prisma.consultationLetter.createMany({
    data: [
      {
        assessmentId,
        userId: user.id,
        email: user.email,
        answers,
      },
    ],
    skipDuplicates: true,
  });
  const letter = await prisma.consultationLetter.findUniqueOrThrow({
    where: { assessmentId },
  });
  return NextResponse.json({ id: letter.id, success: true });
}

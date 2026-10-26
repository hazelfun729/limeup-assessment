import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionHash, sessionOptions } from "@/lib/security/session";

export async function POST(request: NextRequest) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return NextResponse.json({ error: "请从测评入口重新开始" }, { status: 400 });
  try {
    const tokenHash = sessionHash(key);
    const id = `a${tokenHash.slice(0, 32)}`;
    const version = await prisma.questionVersion.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
    if (!version) return NextResponse.json({ error: "题库未配置，请联系管理员" }, { status: 503 });
    const ttl = 30 * 24 * 3600;
    await prisma.$transaction(async tx => {
      await tx.assessment.createMany({ data: { id, questionVersionId: version.id, status: "IN_PROGRESS", currentQuestion: 1, source: request.headers.get("referer"), userAgent: request.headers.get("user-agent") }, skipDuplicates: true });
      await tx.authSession.createMany({ data: { tokenHash, kind: "GUEST", subjectId: id, expiresAt: new Date(Date.now() + ttl * 1000) }, skipDuplicates: true });
    });
    const response = NextResponse.json({ id });
    response.cookies.set(`assessment_${id}`, key, sessionOptions(ttl));
    return response;
  } catch (error) {
    console.error("Assessment creation failed", error);
    return NextResponse.json({ error: "创建测评失败，请稍后重试" }, { status: 500 });
  }
}

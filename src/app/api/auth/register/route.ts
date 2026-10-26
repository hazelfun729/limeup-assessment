import { after } from "next/server";
import { sendProfileEmail } from "@/lib/profile/email";
import { rateLimit } from "@/lib/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, sessionOptions } from "@/lib/security/session";
import { assessmentAccess, completionError } from "@/lib/security/assessment";
import { getSessionMaxAge } from "@/lib/user/auth";
import { bindCompletedAssessment } from "@/lib/assessment/bind";

export async function POST(request: NextRequest) {
  try {
    const { email, code, assessmentId } = await request.json();
    if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "请输入邮箱和六位验证码" }, { status: 400 });
    const limited = await rateLimit("verify", email, 10, 300);
    if (limited) return limited;

    if (assessmentId) {
      if (typeof assessmentId !== "string") return NextResponse.json({ error: "测评ID不正确" }, { status: 400 });
      const denied = await assessmentAccess(assessmentId);
      if (denied) return denied;
      const error = await completionError(assessmentId);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.verificationCode !== code || !user.codeExpiresAt || user.codeExpiresAt <= new Date()) return NextResponse.json({ error: "验证码不正确或已过期" }, { status: 400 });
    await prisma.$transaction(async tx => {
      const verified = await tx.user.updateMany({ where: { id: user.id, verificationCode: code, codeExpiresAt: { gt: new Date() } }, data: { emailVerified: true, verificationCode: null, codeExpiresAt: null } });
      if (!verified.count) throw new Error("Code already used");
      if (assessmentId) {
        await bindCompletedAssessment(tx, assessmentId, user.id);
      }
      else await tx.cRMContact.upsert({ where: { userId: user.id }, create: { userId: user.id, tags: ["测评用户"], source: "测评网站" }, update: {} });
    });
    if (assessmentId) after(async () => { try { await sendProfileEmail(assessmentId); } catch { console.error("Profile email processing failed"); } });
    const response = NextResponse.json({ success: true, userId: user.id, email: user.email, assessmentId });
    const maxAge = getSessionMaxAge();
    response.cookies.set("user_session", await createSession("USER", user.id, maxAge), sessionOptions(maxAge));
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "注册失败，请刷新后重试" }, { status: 400 });
  }
}

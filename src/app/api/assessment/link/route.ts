import { after } from "next/server";
import { sendProfileEmail } from "@/lib/profile/email";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";
import { assessmentAccess, completionError } from "@/lib/security/assessment";
import { bindCompletedAssessment } from "@/lib/assessment/bind";
export async function POST(request: NextRequest) {
  try {
    const user = await getUserSession();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const { assessmentId } = await request.json();
    if (typeof assessmentId !== "string") return NextResponse.json({ error: "缺少测评ID" }, { status: 400 });
    const denied = await assessmentAccess(assessmentId);
    if (denied) return denied;
    const error = await completionError(assessmentId);
    if (error) return NextResponse.json({ error }, { status: 400 });
    await prisma.$transaction(async tx => {
      await bindCompletedAssessment(tx, assessmentId, user.id);
    });
    if (assessmentId) after(async () => { try { await sendProfileEmail(assessmentId); } catch { console.error("Profile email processing failed"); } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assessment linking failed", error);
    return NextResponse.json({ error: "绑定失败，请稍后重试" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { assessmentAccess } from "@/lib/security/assessment";
import { getProfileView } from "@/lib/profile/service";
export async function GET(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
 const { assessmentId } = await params;
 const denied = await assessmentAccess(assessmentId); if (denied) return denied;
 try { return NextResponse.json(await getProfileView(assessmentId)); }
 catch { return NextResponse.json({ error: "暂时无法读取成长画像，请确认已完成测评与注册后重试" }, { status: 400 }); }
}

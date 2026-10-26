import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { getProfileView } from "@/lib/profile/service";
import { renderProfileEmail, sendProfileEmail } from "@/lib/profile/email";
import { publicSiteUrl } from "@/lib/mail/delivery";
export async function GET(r: Request) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const url = new URL(r.url);
  const id = url.searchParams.get("assessmentId");
  if (id) {
    try {
      const p = await getProfileView(id);
      return new Response(
        renderProfileEmail(p, publicSiteUrl() || "https://preview.invalid"),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          },
        },
      );
    } catch {
      return NextResponse.json({ error: "画像暂不可用" }, { status: 400 });
    }
  }
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const assessments = await prisma.assessment.findMany({
    where: { status: "COMPLETED", userId: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 20,
    skip: page * 20,
    select: { id: true, user: { select: { email: true } }, completedAt: true },
  });
  const deliveries = await prisma.delivery.findMany({
    where: { id: { in: assessments.map((a) => `profile-${a.id}`) } },
    select: { id: true, status: true, error: true, sentAt: true },
  });
  return NextResponse.json({
    enabled: !!publicSiteUrl(),
    items: assessments.map((a) => ({
      ...a,
      delivery: deliveries.find((d) => d.id === `profile-${a.id}`) || null,
    })),
  });
}
export async function POST(r: Request) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const b = await r.json().catch(() => null);
  if (typeof b?.assessmentId !== "string")
    return NextResponse.json({ error: "缺少测评ID" }, { status: 400 });
  if (!publicSiteUrl())
    return NextResponse.json(
      { error: "本地阶段仅预览，请先配置公开 HTTPS 网站地址" },
      { status: 409 },
    );
  try {
    const result = await sendProfileEmail(b.assessmentId, true);
    if (result.status !== "SENT")
      return NextResponse.json(
        { error: "邮件未确认发送成功，请检查发送状态" },
        { status: 409 },
      );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "邮件处理失败，请检查发送状态后重试" },
      { status: 500 },
    );
  }
}

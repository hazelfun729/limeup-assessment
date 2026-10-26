import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { escapeHtml, deliver } from "@/lib/mail/delivery";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  const body = await r.json().catch(() => null);
  if (
    typeof body?.reply !== "string" ||
    !body.reply.trim() ||
    body.reply.length > 20000
  )
    return NextResponse.json(
      { error: "请填写回信，最多20000字" },
      { status: 400 },
    );
  const letter = await prisma.consultationLetter.findUnique({ where: { id } });
  if (!letter)
    return NextResponse.json({ error: "来信不存在" }, { status: 404 });
  const deliveryId = `consultation-${id}`;
  const reply = body.reply.trim();
  // Row lock serializes concurrent edits/requests before the delivery claim.
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ConsultationLetter" WHERE id=${id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Delivery" WHERE id=${deliveryId} FOR UPDATE`;
    const previous = await tx.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (previous && !["PENDING", "FAILED"].includes(previous.status)) return;
    const html = `<div style="font-family:sans-serif;line-height:1.9;max-width:640px;margin:auto;padding:24px"><h2>柚子老师的初步回信</h2><div style="white-space:pre-wrap">${escapeHtml(reply)}</div><p>— 柚子老师 · 青柠伴学</p></div>`;
    await tx.consultationLetter.update({
      where: { id },
      data: { reply, repliedBy: admin.id },
    });
    await tx.delivery.upsert({
      where: { id: deliveryId },
      create: {
        id: deliveryId,
        kind: "CONSULTATION",
        userId: letter.userId,
        to: letter.email,
        subject: "柚子老师｜给你的初步回信",
        html,
      },
      update: { html },
    });
  });
  const result = await deliver(deliveryId);
  if (result.status === "SENT") {
    await prisma.consultationLetter.update({
      where: { id },
      data: { status: "REPLIED", sentAt: result.sentAt },
    });
    return NextResponse.json({ success: true });
  }
  if (result.status === "FAILED")
    await prisma.consultationLetter.update({
      where: { id },
      data: { status: "FAILED" },
    });
  return NextResponse.json(
    { error: result.error || "邮件正在发送或结果待核实，请勿重复发送" },
    { status: 409 },
  );
}

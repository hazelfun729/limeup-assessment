import type { Prisma } from "@/generated/prisma/client";

/** Both registration and returning-user linking use the same ownership rule. */
export async function bindCompletedAssessment(tx: Prisma.TransactionClient, assessmentId: string, userId: string) {
  const linked = await tx.assessment.updateMany({
    where: { id: assessmentId, status: "IN_PROGRESS", OR: [{ userId: null }, { userId }] },
    data: { userId, status: "COMPLETED", completedAt: new Date() },
  });
  if (!linked.count) {
    const existing = await tx.assessment.findUnique({ where: { id: assessmentId }, select: { userId: true, status: true } });
    if (existing?.userId !== userId || existing.status !== "COMPLETED") throw new Error("测评已绑定其他账号或状态不可提交");
  }
  await tx.cRMContact.upsert({ where: { userId }, create: { userId, tags: ["测评用户"], source: "测评网站" }, update: {} });
}

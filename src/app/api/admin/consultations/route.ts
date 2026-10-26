import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
export async function GET(r: Request) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const page = Math.max(
    0,
    Number(new URL(r.url).searchParams.get("page")) || 0,
  );
  const letters = await prisma.consultationLetter.findMany({
    orderBy: { createdAt: "desc" },
    skip: page * 20,
    take: 20,
  });
  const deliveries = await prisma.delivery.findMany({
    where: { id: { in: letters.map((l) => `consultation-${l.id}`) } },
    select: { id: true, status: true, error: true },
  });
  return NextResponse.json(
    letters.map((l) => ({
      ...l,
      delivery: deliveries.find((d) => d.id === `consultation-${l.id}`) || null,
    })),
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionHash } from "./session";
// Fixed windows are stored in PostgreSQL so limits survive restarts and multiple workers.
export async function rateLimit(scope: string, identity: string, maximum: number, seconds: number) {
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = sessionHash(`${scope}:${identity.toLowerCase()}:${bucket}`);
  const row = await prisma.authRateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date((bucket + 1) * seconds * 1000) }, update: { count: { increment: 1 } } });
  if (row.count > maximum) return NextResponse.json({ error: "尝试过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": String(seconds) } });
  return null;
}

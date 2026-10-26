import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type SessionKind = "USER" | "ADMIN" | "GUEST";
export const sessionHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const sessionOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });
export async function createSession(kind: SessionKind, subjectId: string, maxAge: number) {
  await prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const token = randomBytes(32).toString("hex");
  await prisma.authSession.create({ data: { tokenHash: sessionHash(token), kind, subjectId, expiresAt: new Date(Date.now() + maxAge * 1000) } });
  return token;
}
export async function readSession(name: string, kind: SessionKind) {
  const token = (await cookies()).get(name)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  let session;
  try {
    session = await prisma.authSession.findUnique({ where: { tokenHash: sessionHash(token) } });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error(`Session database lookup failed (code: ${code})`);
    throw error;
  }
  return session && session.kind === kind && session.expiresAt > new Date() ? session : null;
}
export async function revokeSession(name: string) {
  const token = (await cookies()).get(name)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: sessionHash(token) } });
}

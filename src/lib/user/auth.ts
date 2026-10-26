import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/security/session";
export async function getUserSession() {
  const session = await readSession("user_session", "USER");
  if (!session) return null;
  return prisma.user.findFirst({ where: { id: session.subjectId, emailVerified: true }, select: { id: true, email: true, phone: true, emailVerified: true, createdAt: true } });
}
export async function requireUser() {
  const user = await getUserSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}
export const getSessionCookieName = () => "user_session";
export const getSessionMaxAge = () => 60 * 60 * 24 * 30;

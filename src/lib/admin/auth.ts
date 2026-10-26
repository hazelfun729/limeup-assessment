import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/security/session";

export async function getAdminSession() {
  const session = await readSession("admin_session", "ADMIN");
  if (!session) return null;
  return prisma.admin.findFirst({ where: { id: session.subjectId, isActive: true }, select: { id: true, username: true, email: true, role: true } });
}
export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

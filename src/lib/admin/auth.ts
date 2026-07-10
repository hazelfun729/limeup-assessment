import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export function setSessionCookie(token: string) {
  // This is called from API route which has access to Response
  // We'll handle cookie setting in the API route itself
}

export async function getAdminSession() {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const admin = await prisma.admin.findFirst({
      where: {
        id: token,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });
    return admin;
  } catch {
    // DB not available
    return null;
  }
}

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) {
    throw new Error("Unauthorized");
  }
  return admin;
}

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "user_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getUserSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export async function getUserSession() {
  const token = await getUserSessionToken();
  if (!token) return null;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: token,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUserSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE;
}

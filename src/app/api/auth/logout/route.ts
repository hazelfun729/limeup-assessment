import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/user/auth";

/**
 * POST /api/auth/logout
 * Logout current user
 */
export async function POST() {
  const cookieName = getSessionCookieName();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

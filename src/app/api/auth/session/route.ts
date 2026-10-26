import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user/auth";

/**
 * GET /api/auth/session
 * Get current user session
 */
export async function GET() {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to check user session:", error);
    return NextResponse.json({ error: "账户状态暂不可用" }, { status: 503 });
  }
}

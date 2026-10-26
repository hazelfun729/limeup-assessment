import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { verifyMailService } from "@/lib/mail/delivery";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminSession())?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const result = await verifyMailService();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
// Former fixture generator is intentionally unavailable in every environment.
export async function POST() {
  return NextResponse.json({ error: "测试入口已关闭，请完成正式测评" }, { status: 410 });
}

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { ReportSendError, sendReviewedReport } from "@/lib/report/send";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await sendReviewedReport(id, admin.id);
    await prisma.operationLog.create({
      data: {
        adminId: admin.id, adminName: admin.username, action: "send_report",
        target: id, details: `投递状态 ${result.status}`,
      },
    });
    if (result.status !== "SENT") {
      return NextResponse.json({ error: result.error || "邮件发送结果待核实，请勿重复发送", delivery: result }, { status: 409 });
    }
    return NextResponse.json({ success: true, delivery: result });
  } catch (error) {
    if (error instanceof ReportSendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Send report failed:", error);
    return NextResponse.json({ error: "报告发送失败，请查看邮件记录后重试" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (page - 1) * pageSize;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
        },
      }),
      prisma.email.count({ where }),
    ]);

    return NextResponse.json({
      emails: emails.map((e) => ({
        id: e.id,
        to: e.to,
        userEmail: e.user.email,
        type: e.type,
        subject: e.subject,
        status: e.status,
        sentAt: e.sentAt,
        failedReason: e.failedReason,
        retryCount: e.retryCount,
        createdAt: e.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Emails API error:", error);
    return NextResponse.json({ error: "获取邮件列表失败" }, { status: 500 });
  }
}

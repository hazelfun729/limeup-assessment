import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * POST /api/assessment
 * Create a new assessment session
 */
export async function POST() {
  try {
    const headersList = await headers();

    // Get the active question version
    const questionVersion = await prisma.questionVersion.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!questionVersion) {
      return NextResponse.json(
        { error: "题库未配置，请联系管理员" },
        { status: 503 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        questionVersionId: questionVersion.id,
        status: "IN_PROGRESS",
        currentQuestion: 1,
        source: headersList.get("referer") || null,
        ip: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null,
        userAgent: headersList.get("user-agent") || null,
      },
    });

    return NextResponse.json({ id: assessment.id });
  } catch (error) {
    console.error("Failed to create assessment:", error);
    return NextResponse.json(
      { error: "创建测评失败，请稍后重试" },
      { status: 500 }
    );
  }
}

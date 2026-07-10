import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const version = await prisma.questionVersion.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!version) {
      return NextResponse.json({ questions: [], version: null });
    }

    const questions = await prisma.question.findMany({
      where: { versionId: version.id },
      orderBy: { order: "asc" },
      include: {
        module: {
          include: {
            dimension: { include: { system: true } },
          },
        },
      },
    });

    return NextResponse.json({
      version: { id: version.id, version: version.version },
      questions: questions.map((q) => ({
        id: q.id,
        order: q.order,
        stage: q.stage,
        content: q.content,
        isActive: q.isActive,
        isReverseScored: q.isReverseScored,
        scoreValues: q.scoreValues,
        module: q.module.name,
        dimension: q.module.dimension.name,
        system: q.module.dimension.system.name,
      })),
    });
  } catch (error) {
    console.error("Questions API error:", error);
    return NextResponse.json({ error: "获取题库失败" }, { status: 500 });
  }
}

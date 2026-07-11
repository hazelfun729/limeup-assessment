import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/reports/batch-export
 * Export report data (answers + HTML) for selected assessments
 * Body: { assessmentIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { assessmentIds } = await request.json();
    if (!Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return NextResponse.json({ error: "请选择要导出的报告" }, { status: 400 });
    }

    const results = [];

    for (const aid of assessmentIds) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: aid },
        include: {
          user: { select: { email: true } },
          answerRecords: {
            include: {
              question: {
                include: {
                  module: { include: { dimension: { include: { system: true } } } },
                },
              },
            },
            orderBy: { question: { order: "asc" } },
          },
          handbook: { select: { contentHtml: true, status: true } },
        },
      });

      if (!assessment) continue;

      results.push({
        assessmentId: assessment.id,
        email: assessment.user?.email || "",
        studentName: assessment.studentName || "",
        parentName: assessment.parentName || "",
        grade: assessment.grade || "",
        studentGender: assessment.studentGender || "",
        answers: assessment.answerRecords.map((a) => ({
          order: a.question.order,
          content: a.question.content,
          answer: a.answer,
          score: a.score,
          module: a.question.module.name,
          dimension: a.question.module.dimension.name,
          system: a.question.module.dimension.system.name,
        })),
        contentHtml: assessment.handbook?.contentHtml || null,
        reportStatus: assessment.handbook?.status || null,
      });
    }

    return NextResponse.json({ reports: results });
  } catch (error) {
    console.error("Batch export error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}

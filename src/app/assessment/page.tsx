import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Assessment entry point.
 * Creates a new assessment record in the database, then redirects to the question page.
 */
export default async function AssessmentStartPage() {
  try {
    const headersList = await headers();

    const questionVersion = await prisma.questionVersion.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!questionVersion) {
      return (
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-red-500">题库未配置，请联系管理员</p>
        </main>
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        questionVersionId: questionVersion.id,
        status: "IN_PROGRESS",
        currentQuestion: 1,
        source: headersList.get("referer") || null,
        ip:
          headersList.get("x-forwarded-for") ||
          headersList.get("x-real-ip") ||
          null,
        userAgent: headersList.get("user-agent") || null,
      },
    });

    redirect(`/assessment/${assessment.id}`);
  } catch (error) {
    console.error("Failed to create assessment:", error);
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-red-500">创建测评失败，请稍后重试</p>
      </main>
    );
  }
}

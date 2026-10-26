import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";

export default async function ReportRootPage() {
  const user = await getUserSession();

  if (!user) {
    redirect("/login?redirect=%2Freport");
  }

  const assessment = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (assessment) {
    redirect(`/status/${assessment.id}`);
  }

  redirect("/account");
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";

export default async function ProfileRootPage() {
  const user = await getUserSession();

  if (!user) {
    redirect("/login?redirect=%2Fprofile");
  }

  // Find user's most recent completed assessment
  const assessment = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (assessment) {
    redirect(`/profile/${assessment.id}`);
  }

  // No assessments yet, redirect to account
  redirect("/account");
}

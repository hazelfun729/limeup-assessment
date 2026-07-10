import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export default async function ProfileRootPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_session")?.value;

  if (!userId) {
    redirect("/login?redirect=%2Fprofile");
  }

  // Find user's most recent completed assessment
  const assessment = await prisma.assessment.findFirst({
    where: { userId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (assessment) {
    redirect(`/profile/${assessment.id}`);
  }

  // No assessments yet, redirect to account
  redirect("/account");
}

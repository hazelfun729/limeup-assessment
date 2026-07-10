import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export default async function PaymentRootPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_session")?.value;

  if (!userId) {
    redirect("/login?redirect=%2Fpayment");
  }

  // Find user's most recent assessment that needs payment
  const assessment = await prisma.assessment.findFirst({
    where: {
      userId,
      status: "COMPLETED",
      payment: null,
    },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (assessment) {
    redirect(`/payment/${assessment.id}`);
  }

  // If all assessments are paid, check for pending payments
  const pendingPayment = await prisma.payment.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { assessment: { select: { id: true } } },
  });

  if (pendingPayment) {
    redirect(`/status/${pendingPayment.assessment.id}`);
  }

  redirect("/account");
}

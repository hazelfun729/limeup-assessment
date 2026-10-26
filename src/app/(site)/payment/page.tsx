import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user/auth";

export default async function PaymentRootPage() {
  const user = await getUserSession();

  if (!user) {
    redirect("/login?redirect=%2Fpayment");
  }

  // Find user's most recent assessment that needs payment
  const assessment = await prisma.assessment.findFirst({
    where: {
      userId: user.id,
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
      userId: user.id,
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

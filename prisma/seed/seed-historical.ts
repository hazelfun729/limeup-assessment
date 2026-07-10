/**
 * Seed script: Import 34 historical assessment records
 * Sets status to: Assessment COMPLETED + Payment PENDING (awaiting payment confirmation)
 *
 * Run: npx tsx prisma/seed/seed-historical.ts
 */
import { createPrismaClient } from "./prisma-helper";
import { readFileSync } from "fs";
import { resolve } from "path";

interface HistoricalRecord {
  id: string;
  status: string;
  studentName: string | null;
  parentName: string | null;
  grade: string | null;
  studentGender: string | null;
  userEmail: string;
  answers: Array<{
    questionOrder: number;
    answer: string;
    score: number | null;
  }>;
}

async function main() {
  const prisma = await createPrismaClient();

  // Load historical data
  const dataPath = resolve(__dirname, "historical-data.json");
  const records: HistoricalRecord[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  console.log(`\n📦 Importing ${records.length} historical records...\n`);

  // Get active question version and build order-to-ID map
  const qv = await prisma.questionVersion.findFirst({
    where: { isActive: true },
    include: {
      questions: {
        where: { isActive: true },
        select: { id: true, order: true },
      },
    },
  });

  if (!qv) {
    console.error("No active question version found!");
    process.exit(1);
  }

  const questionMap = new Map<number, string>();
  for (const q of qv.questions) {
    questionMap.set(q.order, q.id);
  }

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    // Check if already imported
    const existing = await prisma.assessment.findUnique({ where: { id: record.id } });
    if (existing) {
      skipped++;
      continue;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: record.userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: record.userEmail,
          emailVerified: true,
        },
      });
    }

    // Create assessment
    await prisma.assessment.create({
      data: {
        id: record.id,
        userId: user.id,
        questionVersionId: qv.id,
        status: "COMPLETED",
        currentQuestion: 67,
        source: "historical_import",
        studentName: record.studentName,
        parentName: record.parentName,
        grade: record.grade,
        studentGender: record.studentGender,
        completedAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Create answers
    const answerOps = record.answers
      .map((a) => {
        const questionId = questionMap.get(a.questionOrder);
        if (!questionId) return null;
        return prisma.assessmentAnswer.create({
          data: {
            assessmentId: record.id,
            questionId,
            answer: a.answer,
            score: a.score,
          },
        });
      })
      .filter(Boolean);

    await Promise.all(answerOps);

    // Create PENDING payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        assessmentId: record.id,
        amount: "9.9",
        originalAmount: "99",
        method: "WECHAT_PAY",
        status: "PENDING",
        orderNo: `HIST-${record.id}`,
      },
    });

    imported++;
    if (imported % 10 === 0) {
      console.log(`  ... ${imported} imported`);
    }
  }

  console.log(`\n✅ Done: ${imported} imported, ${skipped} skipped (already exist)`);
  console.log(`   These will appear in report management as "支付待确认"\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

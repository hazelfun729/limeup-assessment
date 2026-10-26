CREATE TABLE "ConsultationLetter" (
 "id" TEXT PRIMARY KEY, "assessmentId" TEXT NOT NULL UNIQUE REFERENCES "Assessment"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "email" TEXT NOT NULL, "answers" JSONB NOT NULL,
 "reply" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "repliedBy" TEXT, "sentAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ConsultationLetter_userId_idx" ON "ConsultationLetter"("userId");
CREATE TABLE "Delivery" (
 "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "to" TEXT NOT NULL, "subject" TEXT NOT NULL, "html" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "error" TEXT, "sentAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");
ALTER TABLE "ConsultationLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Delivery" ENABLE ROW LEVEL SECURITY;

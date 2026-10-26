CREATE TABLE "AuthSession" ("tokenHash" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AuthSession_kind_subjectId_idx" ON "AuthSession"("kind", "subjectId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "AuthRateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);

ALTER TABLE "Payment" ADD COLUMN "wechatTransactionId" TEXT;
CREATE UNIQUE INDEX "Payment_wechatTransactionId_key" ON "Payment"("wechatTransactionId");

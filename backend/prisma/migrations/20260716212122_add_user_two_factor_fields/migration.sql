-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "twoFactorTempSecret" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

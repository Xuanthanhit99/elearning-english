-- Stage 7A.1: Notification schema foundation for deterministic deduplication.
-- This migration is intentionally limited to database shape/backfill/indexes.

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "recipientUserId" TEXT,
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "deduplicationKey" TEXT,
ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT,
ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill legacy rows so existing notifications participate in recipient-scoped queries.
UPDATE "Notification"
SET "recipientUserId" = "userId"
WHERE "recipientUserId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientUserId_deduplicationKey_key"
ON "Notification"("recipientUserId", "deduplicationKey");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_createdAt_idx"
ON "Notification"("recipientUserId", "isRead", "createdAt");

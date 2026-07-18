-- Stage 7A.4: notification read timestamp and soft archive.
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "Notification"
SET "readAt" = "createdAt"
WHERE "isRead" = true AND "readAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_archivedAt_createdAt_id_idx"
ON "Notification"("recipientUserId", "archivedAt", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_isRead_archivedAt_createdAt_id_idx"
ON "Notification"("recipientUserId", "isRead", "archivedAt", "createdAt", "id");

-- Add an idempotency ledger for Mission V2 progress updates.
-- This table lets event-driven mission progress reject retries without
-- changing historical mission records.
CREATE TABLE "MissionProgressEventV2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "MissionV2Action" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "skill" "LearningSkill",
    "lessonId" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionProgressEventV2_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionProgressEventV2_idempotencyKey_key"
    ON "MissionProgressEventV2"("idempotencyKey");

CREATE INDEX "MissionProgressEventV2_userId_action_createdAt_idx"
    ON "MissionProgressEventV2"("userId", "action", "createdAt");

CREATE INDEX "MissionProgressEventV2_sourceId_idx"
    ON "MissionProgressEventV2"("sourceId");

-- CreateTable
CREATE TABLE "WritingProcessingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "step" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "errorMessage" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "mistakes" JSONB,
    "feedback" TEXT,
    "suggestions" JSONB,
    "nextPractice" JSONB,
    "missionUpdated" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingProcessingJob_userId_createdAt_idx" ON "WritingProcessingJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WritingProcessingJob_sessionId_createdAt_idx" ON "WritingProcessingJob"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "WritingProcessingJob_status_createdAt_idx" ON "WritingProcessingJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WritingProcessingJob" ADD CONSTRAINT "WritingProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingProcessingJob" ADD CONSTRAINT "WritingProcessingJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WritingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

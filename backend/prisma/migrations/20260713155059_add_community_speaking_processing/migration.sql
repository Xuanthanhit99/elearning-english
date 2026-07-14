-- CreateTable
CREATE TABLE "SpeakingProcessingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "step" TEXT NOT NULL DEFAULT 'UPLOAD_COMPLETED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "errorMessage" TEXT,
    "audioPath" TEXT NOT NULL,
    "audioMimeType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "mistakes" JSONB,
    "improvedVersion" TEXT,
    "nextPractice" JSONB,
    "missionUpdated" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeakingProcessingJob_userId_createdAt_idx" ON "SpeakingProcessingJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingProcessingJob_sessionId_createdAt_idx" ON "SpeakingProcessingJob"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingProcessingJob_status_createdAt_idx" ON "SpeakingProcessingJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SpeakingProcessingJob" ADD CONSTRAINT "SpeakingProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingProcessingJob" ADD CONSTRAINT "SpeakingProcessingJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingProcessingJob" ADD CONSTRAINT "SpeakingProcessingJob_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "SpeakingAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

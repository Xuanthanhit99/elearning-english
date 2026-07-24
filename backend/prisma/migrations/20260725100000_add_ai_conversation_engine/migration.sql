-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('FREE', 'TOPIC', 'SCENARIO', 'ROLEPLAY', 'INTERVIEW', 'TRAVEL', 'BUSINESS', 'DAILY_ENGLISH', 'DEBATE', 'STORY');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "ConversationScenario" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mode" "ConversationMode" NOT NULL,
    "difficulty" "CefrLevel" NOT NULL,
    "icon" TEXT,
    "systemPromptTemplate" TEXT NOT NULL,
    "openingLine" TEXT NOT NULL,
    "requiredVocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grammarFocus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "mode" "ConversationMode" NOT NULL,
    "difficulty" "CefrLevel" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "overallScore" INTEGER,
    "fluencyScore" INTEGER,
    "grammarScore" INTEGER,
    "vocabularyScore" INTEGER,
    "pronunciationScore" INTEGER,
    "confidenceScore" INTEGER,
    "naturalnessScore" INTEGER,
    "feedback" TEXT,
    "recommendedVocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedGrammar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "speakingSessionId" TEXT,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationScenario_code_key" ON "ConversationScenario"("code");

-- CreateIndex
CREATE INDEX "ConversationScenario_isActive_mode_displayOrder_idx" ON "ConversationScenario"("isActive", "mode", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSession_speakingSessionId_key" ON "ConversationSession"("speakingSessionId");

-- CreateIndex
CREATE INDEX "ConversationSession_userId_status_lastMessageAt_idx" ON "ConversationSession"("userId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationSession_userId_startedAt_idx" ON "ConversationSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_sessionId_createdAt_idx" ON "ConversationMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ConversationScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


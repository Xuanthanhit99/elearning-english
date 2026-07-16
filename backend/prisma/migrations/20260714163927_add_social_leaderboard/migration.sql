-- CreateEnum
CREATE TYPE "LeaderboardActivityType" AS ENUM ('XP_EARNED', 'LESSON_COMPLETED', 'SPEAKING_COMPLETED', 'WRITING_COMPLETED', 'VOCABULARY_COMPLETED', 'MISSION_COMPLETED', 'STREAK_REACHED', 'LEVEL_UP', 'LEAGUE_PROMOTED', 'ACHIEVEMENT_UNLOCKED', 'CLUB_JOINED', 'CHALLENGE_CREATED', 'CHALLENGE_COMPLETED');

-- CreateEnum
CREATE TYPE "SocialChallengeType" AS ENUM ('FRIEND', 'CLUB');

-- CreateEnum
CREATE TYPE "SocialChallengeMetric" AS ENUM ('XP', 'LESSONS', 'SPEAKING', 'WRITING', 'VOCABULARY', 'STREAK', 'MISSIONS');

-- CreateEnum
CREATE TYPE "SocialChallengeStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialChallengeParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "LeaderboardActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT,
    "type" "LeaderboardActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "xp" INTEGER,
    "sourceId" TEXT,
    "metadata" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialChallenge" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "clubId" TEXT,
    "type" "SocialChallengeType" NOT NULL,
    "metric" "SocialChallengeMetric" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SocialChallengeStatus" NOT NULL DEFAULT 'UPCOMING',
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "SocialChallengeParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardActivity_userId_createdAt_idx" ON "LeaderboardActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardActivity_clubId_createdAt_idx" ON "LeaderboardActivity"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialChallenge_clubId_status_idx" ON "SocialChallenge"("clubId", "status");

-- CreateIndex
CREATE INDEX "SocialChallenge_creatorId_status_idx" ON "SocialChallenge"("creatorId", "status");

-- CreateIndex
CREATE INDEX "SocialChallengeParticipant_userId_status_idx" ON "SocialChallengeParticipant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialChallengeParticipant_challengeId_userId_key" ON "SocialChallengeParticipant"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "LeaderboardActivity" ADD CONSTRAINT "LeaderboardActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialChallenge" ADD CONSTRAINT "SocialChallenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialChallengeParticipant" ADD CONSTRAINT "SocialChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SocialChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialChallengeParticipant" ADD CONSTRAINT "SocialChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('IELTS', 'TOEIC', 'SPEAKING', 'DAILY_ENGLISH', 'BUSINESS_ENGLISH', 'TRAVEL', 'KIDS', 'GRAMMAR', 'VOCABULARY');

-- CreateEnum
CREATE TYPE "EnglishLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "ChallengeMode" AS ENUM ('EASY', 'NORMAL', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "AiPersonality" AS ENUM ('TEACHER', 'COACH', 'FRIEND', 'STRICT_MENTOR');

-- CreateEnum
CREATE TYPE "CorrectionMode" AS ENUM ('MAJOR_ONLY', 'CORRECT_EVERYTHING', 'EXPLAIN_GRAMMAR', 'NATIVE_EXPRESSION');

-- CreateEnum
CREATE TYPE "TranslationMode" AS ENUM ('ALWAYS', 'ON_REQUEST', 'NEVER');

-- CreateEnum
CREATE TYPE "EnglishAccent" AS ENUM ('AMERICAN', 'BRITISH', 'AUSTRALIAN', 'CANADIAN');

-- CreateEnum
CREATE TYPE "MessagePermission" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningGoal" "LearningGoal" NOT NULL DEFAULT 'DAILY_ENGLISH',
    "dailyStudyMinutes" INTEGER NOT NULL DEFAULT 20,
    "preferredSkills" TEXT[] DEFAULT ARRAY['SPEAKING', 'VOCABULARY']::TEXT[],
    "currentLevel" "EnglishLevel" NOT NULL DEFAULT 'A1',
    "autoDetectLevel" BOOLEAN NOT NULL DEFAULT true,
    "challengeMode" "ChallengeMode" NOT NULL DEFAULT 'NORMAL',
    "aiTeacher" TEXT NOT NULL DEFAULT 'Emily',
    "aiPersonality" "AiPersonality" NOT NULL DEFAULT 'COACH',
    "conversationSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "correctionMode" "CorrectionMode" NOT NULL DEFAULT 'EXPLAIN_GRAMMAR',
    "translationMode" "TranslationMode" NOT NULL DEFAULT 'ON_REQUEST',
    "speechProvider" TEXT NOT NULL DEFAULT 'GOOGLE',
    "micSensitivity" INTEGER NOT NULL DEFAULT 60,
    "autoStopSeconds" INTEGER,
    "playbackSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "accent" "EnglishAccent" NOT NULL DEFAULT 'AMERICAN',
    "captionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminderTime" TEXT NOT NULL DEFAULT '19:00',
    "missionReminder" BOOLEAN NOT NULL DEFAULT true,
    "friendActivity" BOOLEAN NOT NULL DEFAULT false,
    "clubNotification" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardNotification" BOOLEAN NOT NULL DEFAULT true,
    "aiFeedbackNotification" BOOLEAN NOT NULL DEFAULT true,
    "emailNotification" BOOLEAN NOT NULL DEFAULT false,
    "pushNotification" BOOLEAN NOT NULL DEFAULT true,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "showStreak" BOOLEAN NOT NULL DEFAULT true,
    "showAchievements" BOOLEAN NOT NULL DEFAULT true,
    "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
    "allowClubInvites" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showLastSeen" BOOLEAN NOT NULL DEFAULT true,
    "communityNickname" TEXT,
    "messagePermission" "MessagePermission" NOT NULL DEFAULT 'FRIENDS',
    "autoJoinVoiceRoom" BOOLEAN NOT NULL DEFAULT false,
    "theme" "ThemeMode" NOT NULL DEFAULT 'SYSTEM',
    "primaryColor" TEXT NOT NULL DEFAULT 'VIOLET',
    "fontScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "keyboardNavigation" BOOLEAN NOT NULL DEFAULT true,
    "screenReaderOptimized" BOOLEAN NOT NULL DEFAULT false,
    "focusMode" BOOLEAN NOT NULL DEFAULT false,
    "energyMode" BOOLEAN NOT NULL DEFAULT true,
    "learningDnaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adaptiveDashboard" BOOLEAN NOT NULL DEFAULT true,
    "autoSchedule" BOOLEAN NOT NULL DEFAULT false,
    "weeklyTargetDays" INTEGER NOT NULL DEFAULT 5,
    "restDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredStudyTime" TEXT NOT NULL DEFAULT '19:00',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dataPersonalization" BOOLEAN NOT NULL DEFAULT true,
    "analyticsConsent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "browser" TEXT,
    "os" TEXT,
    "ipAddress" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "refreshTokenId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningDnaSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strongestSkill" TEXT,
    "weakestSkill" TEXT,
    "bestStudyHour" INTEGER,
    "averageSessionMin" INTEGER,
    "retentionScore" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "recommendedFocus" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningDnaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDeviceSession_refreshTokenId_key" ON "UserDeviceSession"("refreshTokenId");

-- CreateIndex
CREATE INDEX "UserDeviceSession_userId_revokedAt_idx" ON "UserDeviceSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "LearningDnaSnapshot_userId_generatedAt_idx" ON "LearningDnaSnapshot"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeviceSession" ADD CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningDnaSnapshot" ADD CONSTRAINT "LearningDnaSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

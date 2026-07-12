-- CreateTable
CREATE TABLE "UserListeningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL DEFAULT 'A1',
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "totalListeningTime" INTEGER NOT NULL DEFAULT 0,
    "averageAccuracy" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserListeningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserListeningProgress_userId_key" ON "UserListeningProgress"("userId");

-- CreateIndex
CREATE INDEX "UserListeningProgress_currentLevel_idx" ON "UserListeningProgress"("currentLevel");

-- CreateIndex
CREATE INDEX "UserListeningProgress_lastStudyDate_idx" ON "UserListeningProgress"("lastStudyDate");

-- AddForeignKey
ALTER TABLE "UserListeningProgress" ADD CONSTRAINT "UserListeningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

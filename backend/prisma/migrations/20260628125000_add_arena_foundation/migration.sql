CREATE TYPE "ArenaRoomStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'CANCELLED');
CREATE TYPE "ArenaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "ArenaTeam" AS ENUM ('A', 'B');

CREATE TABLE "ArenaProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mmr" INTEGER NOT NULL DEFAULT 1500,
  "arenaPoint" INTEGER NOT NULL DEFAULT 1500,
  "level" INTEGER NOT NULL DEFAULT 1,
  "winCount" INTEGER NOT NULL DEFAULT 0,
  "loseCount" INTEGER NOT NULL DEFAULT 0,
  "winStreak" INTEGER NOT NULL DEFAULT 0,
  "bestWinStreak" INTEGER NOT NULL DEFAULT 0,
  "arenaFood" INTEGER NOT NULL DEFAULT 0,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "trophy" INTEGER NOT NULL DEFAULT 0,
  "lastMatchAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArenaProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaRoom" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "visibility" "ArenaVisibility" NOT NULL DEFAULT 'PUBLIC',
  "password" TEXT,
  "gameMode" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "winCondition" TEXT NOT NULL,
  "durationSec" INTEGER,
  "maxWrong" INTEGER,
  "targetCorrect" INTEGER,
  "bestOf" INTEGER,
  "difficulty" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "teamSize" INTEGER NOT NULL DEFAULT 1,
  "maxPlayers" INTEGER NOT NULL DEFAULT 2,
  "voiceChat" BOOLEAN NOT NULL DEFAULT false,
  "emojiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "ArenaRoomStatus" NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArenaRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaParticipant" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "team" "ArenaTeam" NOT NULL DEFAULT 'A',
  "score" INTEGER NOT NULL DEFAULT 0,
  "correct" INTEGER NOT NULL DEFAULT 0,
  "wrong" INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaMatch" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "winnerTeam" TEXT,
  "result" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaRewardLog" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isWinner" BOOLEAN NOT NULL,
  "mmrBefore" INTEGER NOT NULL,
  "mmrAfter" INTEGER NOT NULL,
  "arenaDelta" INTEGER NOT NULL,
  "foodDelta" INTEGER NOT NULL,
  "goldDelta" INTEGER NOT NULL,
  "trophyDelta" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaRewardLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaProfile_userId_key" ON "ArenaProfile"("userId");
CREATE UNIQUE INDEX "ArenaParticipant_roomId_userId_key" ON "ArenaParticipant"("roomId", "userId");

ALTER TABLE "ArenaProfile" ADD CONSTRAINT "ArenaProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaRoom" ADD CONSTRAINT "ArenaRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArenaRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArenaRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaRewardLog" ADD CONSTRAINT "ArenaRewardLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaRewardLog" ADD CONSTRAINT "ArenaRewardLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "ArenaQuestion" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "answer" TEXT NOT NULL,
  "explanation" TEXT,
  "mediaUrl" TEXT,
  "points" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaAnswer" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaQuestion_matchId_order_key" ON "ArenaQuestion"("matchId", "order");
CREATE UNIQUE INDEX "ArenaAnswer_questionId_userId_key" ON "ArenaAnswer"("questionId", "userId");

ALTER TABLE "ArenaQuestion" ADD CONSTRAINT "ArenaQuestion_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaAnswer" ADD CONSTRAINT "ArenaAnswer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaAnswer" ADD CONSTRAINT "ArenaAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ArenaQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaAnswer" ADD CONSTRAINT "ArenaAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
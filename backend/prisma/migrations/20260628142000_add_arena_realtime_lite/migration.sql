CREATE TABLE "ArenaQueue" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameMode" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "mmr" INTEGER NOT NULL,
  "searchMinMmr" INTEGER NOT NULL,
  "searchMaxMmr" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArenaQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaRoomEvent" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaRoomEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaQueue_userId_key" ON "ArenaQueue"("userId");

ALTER TABLE "ArenaQueue" ADD CONSTRAINT "ArenaQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaRoomEvent" ADD CONSTRAINT "ArenaRoomEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArenaRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaRoomEvent" ADD CONSTRAINT "ArenaRoomEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- PostgreSQL is the source of truth for the Redis projection revision.
CREATE TABLE "XpRedisProjectionRevision" (
  "redisKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XpRedisProjectionRevision_pkey" PRIMARY KEY ("redisKey", "userId")
);

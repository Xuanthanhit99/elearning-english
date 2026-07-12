CREATE TYPE "AILessonBuilderStatus" AS ENUM (
  'OUTLINE_PENDING',
  'OUTLINE_COMPLETED',
  'CONTENT_PENDING',
  'CONTENT_COMPLETED',
  'IN_PROGRESS',
  'COMPLETED'
);

CREATE TABLE "AILessonBuilderProject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "goal" TEXT NOT NULL,
  "audienceAge" TEXT,
  "level" TEXT,
  "dailyMinutes" INTEGER,
  "totalDays" INTEGER,
  "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "focusSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "outline" JSONB,
  "generationPrompt" TEXT,
  "status" "AILessonBuilderStatus" NOT NULL DEFAULT 'OUTLINE_PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AILessonBuilderProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AILessonBuilderProject_userId_status_idx" ON "AILessonBuilderProject"("userId", "status");
CREATE INDEX "AILessonBuilderProject_courseId_idx" ON "AILessonBuilderProject"("courseId");

ALTER TABLE "AILessonBuilderProject"
  ADD CONSTRAINT "AILessonBuilderProject_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AILessonBuilderProject"
  ADD CONSTRAINT "AILessonBuilderProject_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

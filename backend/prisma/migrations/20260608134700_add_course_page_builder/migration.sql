-- CreateTable
CREATE TABLE "CoursePage" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePage_courseId_key" ON "CoursePage"("courseId");

-- AddForeignKey
ALTER TABLE "CoursePage" ADD CONSTRAINT "CoursePage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

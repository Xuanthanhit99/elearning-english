-- CreateTable
CREATE TABLE "CourseLanding" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "headline" TEXT,
    "subTitle" TEXT,
    "introVideo" TEXT,
    "benefits" JSONB,
    "faq" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseLanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseLanding_courseId_key" ON "CourseLanding"("courseId");

-- AddForeignKey
ALTER TABLE "CourseLanding" ADD CONSTRAINT "CourseLanding_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

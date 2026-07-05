/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `GrammarTopic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GrammarTopic_slug_key" ON "GrammarTopic"("slug");

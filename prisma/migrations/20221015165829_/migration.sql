/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `SelectedTopic` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[topicId]` on the table `SelectedTopic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SelectedTopic_userId_key" ON "SelectedTopic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedTopic_topicId_key" ON "SelectedTopic"("topicId");

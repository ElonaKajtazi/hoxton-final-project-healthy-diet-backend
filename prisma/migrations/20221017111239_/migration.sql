/*
  Warnings:

  - The primary key for the `SelectedTopic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `selectedTopicUserId` on the `Tweet` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SelectedTopic" (
    "userId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    CONSTRAINT "SelectedTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SelectedTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SelectedTopic" ("topicId", "userId") SELECT "topicId", "userId" FROM "SelectedTopic";
DROP TABLE "SelectedTopic";
ALTER TABLE "new_SelectedTopic" RENAME TO "SelectedTopic";
CREATE TABLE "new_Tweet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedTopicTopicId" INTEGER,
    CONSTRAINT "Tweet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tweet_selectedTopicTopicId_fkey" FOREIGN KEY ("selectedTopicTopicId") REFERENCES "SelectedTopic" ("topicId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tweet" ("authorId", "id", "selectedTopicTopicId", "text", "time") SELECT "authorId", "id", "selectedTopicTopicId", "text", "time" FROM "Tweet";
DROP TABLE "Tweet";
ALTER TABLE "new_Tweet" RENAME TO "Tweet";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

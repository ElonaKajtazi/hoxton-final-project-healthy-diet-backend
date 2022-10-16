/*
  Warnings:

  - You are about to drop the `_TopicToTweet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `selectedTopicId` to the `Tweet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "_TopicToTweet_B_index";

-- DropIndex
DROP INDEX "_TopicToTweet_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_TopicToTweet";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tweet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedTopicId" INTEGER NOT NULL,
    CONSTRAINT "Tweet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tweet_selectedTopicId_fkey" FOREIGN KEY ("selectedTopicId") REFERENCES "SelectedTopic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tweet" ("authorId", "id", "text", "time") SELECT "authorId", "id", "text", "time" FROM "Tweet";
DROP TABLE "Tweet";
ALTER TABLE "new_Tweet" RENAME TO "Tweet";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

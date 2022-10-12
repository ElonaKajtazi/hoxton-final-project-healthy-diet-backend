/*
  Warnings:

  - You are about to drop the column `tweetId` on the `Topic` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_TopicToTweet" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_TopicToTweet_A_fkey" FOREIGN KEY ("A") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TopicToTweet_B_fkey" FOREIGN KEY ("B") REFERENCES "Tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "avatar" TEXT NOT NULL,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Topic" ("avatar", "id", "name") SELECT "avatar", "id", "name" FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "_TopicToTweet_AB_unique" ON "_TopicToTweet"("A", "B");

-- CreateIndex
CREATE INDEX "_TopicToTweet_B_index" ON "_TopicToTweet"("B");

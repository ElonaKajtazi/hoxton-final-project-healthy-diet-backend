/*
  Warnings:

  - You are about to drop the `choosenTopic` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `topicId` to the `SelectedTopic` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "choosenTopic";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ChoosenTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    CONSTRAINT "ChoosenTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChoosenTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SelectedTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    CONSTRAINT "SelectedTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SelectedTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SelectedTopic" ("id", "userId") SELECT "id", "userId" FROM "SelectedTopic";
DROP TABLE "SelectedTopic";
ALTER TABLE "new_SelectedTopic" RENAME TO "SelectedTopic";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

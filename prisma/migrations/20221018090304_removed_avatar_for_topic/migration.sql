/*
  Warnings:

  - You are about to drop the column `avatar` on the `Topic` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Topic" ("id", "name") SELECT "id", "name" FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

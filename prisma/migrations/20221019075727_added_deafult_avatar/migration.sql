-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "avatar" TEXT DEFAULT 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "twwetTicket" INTEGER NOT NULL DEFAULT 1,
    "commentTicket" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_User" ("avatar", "commentTicket", "email", "id", "name", "password", "twwetTicket") SELECT "avatar", "commentTicket", "email", "id", "name", "password", "twwetTicket" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

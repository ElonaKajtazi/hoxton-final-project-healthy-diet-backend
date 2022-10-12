-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "twwetTicket" INTEGER NOT NULL DEFAULT 1,
    "commentTicket" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_User" ("email", "id", "password", "twwetTicket") SELECT "email", "id", "password", "twwetTicket" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

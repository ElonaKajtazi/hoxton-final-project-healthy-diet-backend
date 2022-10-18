-- CreateTable
CREATE TABLE "Friendship" (
    "friend1Id" INTEGER NOT NULL,
    "friend2Id" INTEGER NOT NULL,

    PRIMARY KEY ("friend1Id", "friend2Id"),
    CONSTRAINT "Friendship_friend1Id_fkey" FOREIGN KEY ("friend1Id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friend2Id_fkey" FOREIGN KEY ("friend2Id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

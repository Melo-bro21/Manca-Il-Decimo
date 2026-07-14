/*
  Warnings:

  - You are about to drop the column `adress` on the `SportsCenter` table. All the data in the column will be lost.
  - Added the required column `address` to the `SportsCenter` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SportsCenter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SportsCenter" ("city", "createdAt", "id", "name", "phone", "updatedAt") SELECT "city", "createdAt", "id", "name", "phone", "updatedAt" FROM "SportsCenter";
DROP TABLE "SportsCenter";
ALTER TABLE "new_SportsCenter" RENAME TO "SportsCenter";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

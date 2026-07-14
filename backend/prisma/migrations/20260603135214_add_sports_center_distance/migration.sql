-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SportsCenter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "distanceKm" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SportsCenter" ("address", "city", "createdAt", "id", "name", "phone", "updatedAt") SELECT "address", "city", "createdAt", "id", "name", "phone", "updatedAt" FROM "SportsCenter";
DROP TABLE "SportsCenter";
ALTER TABLE "new_SportsCenter" RENAME TO "SportsCenter";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

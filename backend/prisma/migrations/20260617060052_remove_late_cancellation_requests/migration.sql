/*
  Warnings:

  - You are about to drop the `LateCancellationRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `lateCancellationRequestId` on the `Notification` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LateCancellationRequest_status_idx";

-- DropIndex
DROP INDEX "LateCancellationRequest_matchId_idx";

-- DropIndex
DROP INDEX "LateCancellationRequest_userId_idx";

-- DropIndex
DROP INDEX "LateCancellationRequest_bookingId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LateCancellationRequest";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "matchId" INTEGER,
    "bookingId" INTEGER,
    "penaltyId" INTEGER,
    "waitlistEntryId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_penaltyId_fkey" FOREIGN KEY ("penaltyId") REFERENCES "Penalty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("bookingId", "createdAt", "id", "matchId", "message", "penaltyId", "read", "title", "type", "updatedAt", "userId", "waitlistEntryId") SELECT "bookingId", "createdAt", "id", "matchId", "message", "penaltyId", "read", "title", "type", "updatedAt", "userId", "waitlistEntryId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

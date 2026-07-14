-- CreateTable
CREATE TABLE "LateCancellationRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "refundStatus" TEXT NOT NULL DEFAULT 'NOT_REFUNDED',
    "creatorNote" TEXT,
    "reliabilityPenaltyPoints" INTEGER NOT NULL DEFAULT 3,
    "userId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LateCancellationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LateCancellationRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LateCancellationRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "lateCancellationRequestId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_penaltyId_fkey" FOREIGN KEY ("penaltyId") REFERENCES "Penalty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_lateCancellationRequestId_fkey" FOREIGN KEY ("lateCancellationRequestId") REFERENCES "LateCancellationRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("bookingId", "createdAt", "id", "matchId", "message", "penaltyId", "read", "title", "type", "updatedAt", "userId", "waitlistEntryId") SELECT "bookingId", "createdAt", "id", "matchId", "message", "penaltyId", "read", "title", "type", "updatedAt", "userId", "waitlistEntryId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LateCancellationRequest_bookingId_key" ON "LateCancellationRequest"("bookingId");

-- CreateIndex
CREATE INDEX "LateCancellationRequest_userId_idx" ON "LateCancellationRequest"("userId");

-- CreateIndex
CREATE INDEX "LateCancellationRequest_matchId_idx" ON "LateCancellationRequest"("matchId");

-- CreateIndex
CREATE INDEX "LateCancellationRequest_status_idx" ON "LateCancellationRequest"("status");

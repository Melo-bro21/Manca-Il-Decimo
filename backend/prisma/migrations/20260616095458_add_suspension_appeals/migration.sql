-- CreateTable
CREATE TABLE "SuspensionAppeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "userId" INTEGER NOT NULL,
    "playerReportId" INTEGER,
    "resolvedByAdminId" INTEGER,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SuspensionAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SuspensionAppeal_playerReportId_fkey" FOREIGN KEY ("playerReportId") REFERENCES "PlayerReport" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SuspensionAppeal_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SuspensionAppeal_userId_idx" ON "SuspensionAppeal"("userId");

-- CreateIndex
CREATE INDEX "SuspensionAppeal_status_idx" ON "SuspensionAppeal"("status");

-- CreateEnum
CREATE TYPE "DisciplinaryCardType" AS ENUM ('YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "DisciplinaryCardReason" AS ENUM ('LATE_CANCELLATION', 'NO_SHOW', 'DOUBLE_YELLOW', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "DisciplinaryCardStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "DisciplinaryCard" (
    "id" SERIAL NOT NULL,
    "type" "DisciplinaryCardType" NOT NULL,
    "reason" "DisciplinaryCardReason" NOT NULL,
    "status" "DisciplinaryCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "recipientId" INTEGER NOT NULL,
    "issuedById" INTEGER,
    "matchId" INTEGER,
    "bookingId" INTEGER,
    "sourceYellowCardIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisciplinaryCard_recipientId_status_idx" ON "DisciplinaryCard"("recipientId", "status");

-- CreateIndex
CREATE INDEX "DisciplinaryCard_recipientId_type_status_idx" ON "DisciplinaryCard"("recipientId", "type", "status");

-- CreateIndex
CREATE INDEX "DisciplinaryCard_expiresAt_idx" ON "DisciplinaryCard"("expiresAt");

-- CreateIndex
CREATE INDEX "DisciplinaryCard_matchId_idx" ON "DisciplinaryCard"("matchId");

-- CreateIndex
CREATE INDEX "DisciplinaryCard_bookingId_idx" ON "DisciplinaryCard"("bookingId");

-- AddForeignKey
ALTER TABLE "DisciplinaryCard" ADD CONSTRAINT "DisciplinaryCard_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCard" ADD CONSTRAINT "DisciplinaryCard_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCard" ADD CONSTRAINT "DisciplinaryCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCard" ADD CONSTRAINT "DisciplinaryCard_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

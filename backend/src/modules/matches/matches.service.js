const matchesRepository = require("./matches.repository");
const notificationsService = require("../notifications/notifications.service");
const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const suspensionService = require("../../shared/suspension.service");
const disciplinaryCardsService = require(
  "../disciplinary-cards/disciplinary-cards.service"
);  

const MAX_GOALKEEPERS_PER_MATCH = 2;

function getMatchEndDate(startsAt, durationMinutes) {
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

function hasTimeOverlap(existingMatch, newStart, newEnd) {
  const existingStart = new Date(existingMatch.startsAt);
  const existingEnd = getMatchEndDate(
    existingStart,
    existingMatch.durationMinutes
  );

  return existingStart < newEnd && existingEnd > newStart;
}

function normalizeRole(role) {
  if (!role) {
    return "UNKNOWN";
  }

  const normalizedRole = role.trim().toUpperCase();

  if (
    normalizedRole === "PORTIERE" ||
    normalizedRole === "GOALKEEPER" ||
    normalizedRole === "GK"
  ) {
    return "PORTIERE";
  }

  if (
    normalizedRole === "DIFENSORE" ||
    normalizedRole === "DIFENSORE CENTRALE" ||
    normalizedRole === "DEFENDER"
  ) {
    return "DIFENSORE";
  }

  if (
    normalizedRole === "CENTROCAMPISTA" ||
    normalizedRole === "MIDFIELDER"
  ) {
    return "CENTROCAMPISTA";
  }

  if (
    normalizedRole === "ATTACCANTE" ||
    normalizedRole === "PUNTA" ||
    normalizedRole === "STRIKER" ||
    normalizedRole === "FORWARD"
  ) {
    return "ATTACCANTE";
  }

  return "UNKNOWN";
}

async function ensureFieldIsAvailable({ fieldId, startsAt, durationMinutes }) {
  const newStart = startsAt;
  const newEnd = getMatchEndDate(newStart, durationMinutes);

  const activeMatchesOnField = await prisma.match.findMany({
    where: {
      fieldId,
      status: {
        notIn: ["CANCELLED", "COMPLETED"],
      },
    },
    select: {
      id: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
    },
  });

  const conflictingMatch = activeMatchesOnField.find((match) => {
    return hasTimeOverlap(match, newStart, newEnd);
  });

  if (conflictingMatch) {
    throw new AppError("Campo già occupato in questo orario", 400);
  }
}

function normalizeGuests(guests) {
  if (!Array.isArray(guests)) {
    return [];
  }

  return guests.map((guest) => {
    return {
      name: guest.name.trim(),
      preferredRole: normalizeRole(guest.preferredRole),
    };
  });
}

function ensureGuestsAreValid({ creator, guests, maxPlayers }) {
  const initialPlayersCount = 1 + guests.length;

  if (initialPlayersCount > maxPlayers) {
    throw new AppError(
      "Hai inserito troppi giocatori già presenti per questo tipo di partita",
      400
    );
  }

  const goalkeeperCount =
    (normalizeRole(creator.preferredRole) === "PORTIERE" ? 1 : 0) +
    guests.filter((guest) => guest.preferredRole === "PORTIERE").length;

  if (goalkeeperCount > MAX_GOALKEEPERS_PER_MATCH) {
    throw new AppError(
      "La partita non può avere più di 2 portieri iniziali",
      400
    );
  }

  const hasInvalidGuestRole = guests.some((guest) => {
    return guest.preferredRole === "UNKNOWN";
  });

  if (hasInvalidGuestRole) {
    throw new AppError("Uno o più ruoli dei giocatori iniziali non sono validi", 400);
  }
}

async function getMatches() {
  return matchesRepository.findAllMatches();
}

async function getMatchById(id) {
  const match = await matchesRepository.findMatchById(id);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  return match;
}

async function createMatch({ creatorId, matchData }) {
  await suspensionService.ensureUserCanUseMatchFeatures(creatorId);

  await disciplinaryCardsService.ensureUserHasNoActiveRedCard(
    creatorId
  );

  const {
    title,
    description,
    fieldId,
    startsAt,
    durationMinutes,
    maxPlayers,
    pricePerPlayer,
    // DEPOSIT REMOVED: depositAmount rimosso
    onlyReliableUsers,
    minReliabilityScore,
    requiresApproval,
    guests,
  } = matchData;

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
  });

  if (!creator) throw new AppError("Creator not found", 404);

  const field = await prisma.field.findUnique({
    where: { id: fieldId },
  });

  if (!field) throw new AppError("Field not found", 404);

  const matchDate = new Date(startsAt);
  if (Number.isNaN(matchDate.getTime())) throw new AppError("Invalid match date", 400);
  if (matchDate <= new Date()) throw new AppError("Match date must be in the future", 400);

  await ensureFieldIsAvailable({ fieldId, startsAt: matchDate, durationMinutes });

  const normalizedGuests = normalizeGuests(guests);
  ensureGuestsAreValid({ creator, guests: normalizedGuests, maxPlayers });

  const wantsPremiumOptions =
    requiresApproval === true ||
    onlyReliableUsers === true ||
    minReliabilityScore !== undefined;

  if (wantsPremiumOptions && !creator.isPremium) {
    throw new AppError("Only premium users can create matches with advanced options", 403);
  }

  const usesReliabilityFilter = onlyReliableUsers === true;
  const cleanMinReliabilityScore = usesReliabilityFilter ? (minReliabilityScore ?? 0) : null;

  if (usesReliabilityFilter && (cleanMinReliabilityScore < 0 || cleanMinReliabilityScore > 100)) {
    throw new AppError("Il punteggio minimo di affidabilità deve essere compreso tra 0 e 100", 400);
  }

  const currentPlayers = 1 + normalizedGuests.length;
  const status = currentPlayers >= maxPlayers ? "FULL" : "OPEN";

  const match = await matchesRepository.createMatch({
    title,
    description,
    fieldId,
    creatorId,
    startsAt: matchDate,
    durationMinutes,
    maxPlayers,
    currentPlayers,
    pricePerPlayer,
    // DEPOSIT REMOVED: non inviamo più depositAmount al DB
    status,
    onlyReliableUsers: usesReliabilityFilter,
    minReliabilityScore: cleanMinReliabilityScore,
    requiresApproval: requiresApproval || false,
    guests: normalizedGuests.length > 0 ? { create: normalizedGuests } : undefined,
  });

  return match;
}

async function cancelMatch({ matchId, userId }) {
  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.creatorId !== userId) {
    throw new AppError("You are not allowed to cancel this match", 403);
  }

  if (match.status === "CANCELLED") {
    throw new AppError("Match is already cancelled", 400);
  }

  if (match.status === "COMPLETED") {
    throw new AppError("Completed matches cannot be cancelled", 400);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      matchId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const waitlistEntries = await prisma.waitlistEntry.findMany({
    where: {
      matchId,
      status: "WAITING",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const cancelledMatch = await matchesRepository.updateMatchStatus(
    matchId,
    "CANCELLED"
  );

  const bookingNotifications = bookings.map((booking) => {
    return {
      userId: booking.userId,
      type: notificationsService.NOTIFICATION_TYPES.MATCH_CANCELLED,
      title: "Partita cancellata",
      message: `La partita "${match.title}" è stata cancellata.`,
      matchId: match.id,
      bookingId: booking.id,
    };
  });

  const waitlistNotifications = waitlistEntries.map((waitlistEntry) => {
    return {
      userId: waitlistEntry.userId,
      type: notificationsService.NOTIFICATION_TYPES.MATCH_CANCELLED,
      title: "Partita cancellata",
      message: `La partita "${match.title}" è stata cancellata.`,
      matchId: match.id,
      waitlistEntryId: waitlistEntry.id,
    };
  });

  await notificationsService.createManyNotifications([
    ...bookingNotifications,
    ...waitlistNotifications,
  ]);

  return cancelledMatch;
}

module.exports = {
  getMatches,
  getMatchById,
  createMatch,
  cancelMatch,
};
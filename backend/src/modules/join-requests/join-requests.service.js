const joinRequestsRepository = require("./join-requests.repository");
const matchesRepository = require("../matches/matches.repository");
const bookingsRepository = require("../bookings/bookings.repository");
const notificationsService = require("../notifications/notifications.service");
const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const suspensionService = require("../../shared/suspension.service");

const MAX_GOALKEEPERS_PER_MATCH = 2;

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

async function countPlayersByRole(db, match, roleToCount) {
  let count = 0;

  const creator = await db.user.findUnique({
    where: {
      id: match.creatorId,
    },
    select: {
      preferredRole: true,
    },
  });

  if (normalizeRole(creator?.preferredRole) === roleToCount) {
    count += 1;
  }

  const guests = match.guests || [];

  for (const guest of guests) {
    if (normalizeRole(guest.preferredRole) === roleToCount) {
      count += 1;
    }
  }

  const activeBookings = await db.booking.findMany({
    where: {
      matchId: match.id,
      status: "ACTIVE",
    },
    include: {
      user: {
        select: {
          preferredRole: true,
        },
      },
    },
  });

  for (const booking of activeBookings) {
    if (normalizeRole(booking.user?.preferredRole) === roleToCount) {
      count += 1;
    }
  }

  return count;
}

async function ensureRoleCapacity(db, match, preferredRole) {
  const normalizedRole = normalizeRole(preferredRole);

  if (normalizedRole !== "PORTIERE") {
    return;
  }

  const goalkeeperCount = await countPlayersByRole(
    db,
    match,
    "PORTIERE"
  );

  if (goalkeeperCount >= MAX_GOALKEEPERS_PER_MATCH) {
    throw new AppError(
      "La partita ha già raggiunto il numero massimo di portieri",
      400
    );
  }
}

function ensureReliabilityRequirement(match, user) {
  if (!match.onlyReliableUsers) {
    return;
  }

  const minimumReliabilityScore = match.minReliabilityScore ?? 0;
  const userReliabilityScore = user.reliabilityScore ?? 0;

  if (userReliabilityScore < minimumReliabilityScore) {
    throw new AppError(
      `Affidabilità insufficiente per questa partita. Richiesta: ${minimumReliabilityScore}, attuale: ${userReliabilityScore}.`,
      403
    );
  }
}

async function requestToJoinMatch({ userId, matchId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      preferredRole: true,
      reliabilityScore: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.preferredRole) {
    throw new AppError(
      "Devi impostare un ruolo preferito prima di inviare una richiesta",
      400
    );
  }

  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.creatorId === userId) {
    throw new AppError("Creator is already part of this match", 400);
  }

  if (match.status !== "OPEN") {
    throw new AppError("Match is not open", 400);
  }

  if (!match.requiresApproval) {
    throw new AppError(
      "This match does not require approval. Join directly.",
      400
    );
  }

  if (match.currentPlayers >= match.maxPlayers) {
    throw new AppError("Match is full", 400);
  }

  ensureReliabilityRequirement(match, user);

  await ensureRoleCapacity(prisma, match, user.preferredRole);

  const existingBooking = await bookingsRepository.findBookingByUserAndMatch(
    userId,
    matchId
  );

  if (existingBooking) {
    throw new AppError("You already joined this match", 400);
  }

  const existingRequest = await joinRequestsRepository.findRequestByUserAndMatch(
    userId,
    matchId
  );

  if (existingRequest) {
    throw new AppError("You already sent a request for this match", 400);
  }

  const joinRequest = await joinRequestsRepository.createJoinRequest({
    userId,
    matchId,
  });

  await notificationsService.createNotification({
    userId: match.creatorId,
    type: "JOIN_REQUEST_RECEIVED",
    title: "Nuova richiesta di partecipazione",
    message: `${
      joinRequest.user.name || "Un utente"
    } ha richiesto di partecipare alla partita "${match.title}".`,
    matchId: match.id,
  });

  return joinRequest;
}

async function getMatchJoinRequests({ userId, matchId }) {
  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.creatorId !== userId) {
    throw new AppError("You are not allowed to view these requests", 403);
  }

  return joinRequestsRepository.findRequestsByMatchId(matchId);
}

async function approveJoinRequest({ userId, requestId }) {
  const joinRequest = await joinRequestsRepository.findRequestById(requestId);

  if (!joinRequest) {
    throw new AppError("Join request not found", 404);
  }

  await suspensionService.ensureUserCanUseMatchFeatures(userId);
  await suspensionService.ensureUserCanUseMatchFeatures(joinRequest.userId);

  const match = await matchesRepository.findMatchById(joinRequest.matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const requestingUser = await prisma.user.findUnique({
    where: {
      id: joinRequest.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      preferredRole: true,
      reliabilityScore: true,
    },
  });

  if (!requestingUser) {
    throw new AppError("User not found", 404);
  }

  if (!requestingUser.preferredRole) {
    throw new AppError(
      "L'utente deve impostare un ruolo preferito prima di essere accettato",
      400
    );
  }

  if (match.creatorId !== userId) {
    throw new AppError("You are not allowed to approve this request", 403);
  }

  if (joinRequest.status !== "PENDING") {
    throw new AppError("Join request is not pending", 400);
  }

  if (match.status !== "OPEN") {
    throw new AppError("Match is not open", 400);
  }

  if (match.currentPlayers >= match.maxPlayers) {
    throw new AppError("Match is full", 400);
  }

  ensureReliabilityRequirement(match, requestingUser);

  await ensureRoleCapacity(
    prisma,
    match,
    requestingUser.preferredRole
  );

  const existingBooking = await bookingsRepository.findBookingByUserAndMatch(
    joinRequest.userId,
    joinRequest.matchId
  );

  if (existingBooking) {
    throw new AppError("User already joined this match", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const newCurrentPlayers = match.currentPlayers + 1;

    const newStatus =
      newCurrentPlayers >= match.maxPlayers
        ? "FULL"
        : match.status;

    const updatedRequest = await tx.matchJoinRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "APPROVED",
      },
    });

    const booking = await tx.booking.create({
      data: {
        userId: joinRequest.userId,
        matchId: joinRequest.matchId,
        status: "ACTIVE",
        paymentMethod: "ON_SITE",
        paymentStatus: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
        match: {
          include: {
            field: {
              include: {
                sportsCenter: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await tx.match.update({
      where: {
        id: joinRequest.matchId,
      },
      data: {
        currentPlayers: newCurrentPlayers,
        status: newStatus,
      },
    });

    return {
      request: updatedRequest,
      booking,
    };
  });

  await notificationsService.createNotification({
    userId: joinRequest.userId,
    type: "JOIN_REQUEST_APPROVED",
    title: "Richiesta accettata",
    message: `La tua richiesta per la partita "${match.title}" è stata accettata.`,
    matchId: match.id,
    bookingId: result.booking.id,
  });

  return result;
}

async function rejectJoinRequest({ userId, requestId }) {
  const joinRequest = await joinRequestsRepository.findRequestById(requestId);

  if (!joinRequest) {
    throw new AppError("Join request not found", 404);
  }

  if (joinRequest.match.creatorId !== userId) {
    throw new AppError("You are not allowed to reject this request", 403);
  }

  if (joinRequest.status !== "PENDING") {
    throw new AppError("Join request is not pending", 400);
  }

  const rejectedRequest = await joinRequestsRepository.updateRequestStatus(
    requestId,
    "REJECTED"
  );

  await notificationsService.createNotification({
    userId: joinRequest.userId,
    type: "JOIN_REQUEST_REJECTED",
    title: "Richiesta rifiutata",
    message: `La tua richiesta per la partita "${joinRequest.match.title}" è stata rifiutata.`,
    matchId: joinRequest.match.id,
  });

  return rejectedRequest;
}

module.exports = {
  requestToJoinMatch,
  getMatchJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};
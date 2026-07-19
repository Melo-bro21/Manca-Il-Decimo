const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const waitlistRepository = require("./waitlist.repository");
const notificationsService = require("../notifications/notifications.service");
const suspensionService = require("../../shared/suspension.service");
const disciplinaryCardsService = require(
  "../disciplinary-cards/disciplinary-cards.service"
);

const RESERVED_SPOT_MINUTES = 60;

function getReservedExpiresAt() {
  return new Date(Date.now() + RESERVED_SPOT_MINUTES * 60 * 1000);
}

function isReservedEntryExpired(waitlistEntry) {
  if (!waitlistEntry.reservedExpiresAt) {
    return false;
  }

  return new Date(waitlistEntry.reservedExpiresAt) <= new Date();
}

async function joinWaitlist({ userId, matchId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  await disciplinaryCardsService.ensureUserHasNoActiveRedCard(
    userId
  );

  const match = await waitlistRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.creatorId === userId) {
    throw new AppError("Creator cannot join waitlist for own match", 400);
  }

  if (match.status !== "FULL") {
    throw new AppError("Waitlist is available only for full matches", 400);
  }

  const existingBooking = await waitlistRepository.findBookingByUserAndMatch(
    userId,
    matchId
  );

  if (existingBooking) {
    throw new AppError("User is already booked for this match", 400);
  }

  const existingWaitlistEntry =
    await waitlistRepository.findWaitlistEntryByUserAndMatch(userId, matchId);

  if (
    existingWaitlistEntry &&
    existingWaitlistEntry.status !== "EXPIRED"
  ) {
    throw new AppError("User is already in waitlist for this match", 400);
  }

  const waitingCount = await waitlistRepository.countWaitlistEntriesByMatchId(
    matchId
  );

  const position = waitingCount + 1;

  let waitlistEntry;

  if (existingWaitlistEntry && existingWaitlistEntry.status === "EXPIRED") {
    waitlistEntry = await prisma.waitlistEntry.update({
      where: {
        id: existingWaitlistEntry.id,
      },
      data: {
        position,
        status: "WAITING",
        reservedExpiresAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
          },
        },
        match: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            status: true,
          },
        },
      },
    });
  } else {
    waitlistEntry = await waitlistRepository.createWaitlistEntry({
      userId,
      matchId,
      position,
      status: "WAITING",
      reservedExpiresAt: null,
    });
  }

  await notificationsService.createNotification({
    userId,
    type: "WAITLIST_JOINED",
    title: "Sei entrato in lista d'attesa",
    message: `Sei entrato nella lista d'attesa per la partita "${match.title}". Posizione: ${position}.`,
    matchId: match.id,
    waitlistEntryId: waitlistEntry.id,
  });

  await notificationsService.createNotification({
    userId: match.creatorId,
    type: "MATCH_NEW_WAITLIST_ENTRY",
    title: "Nuovo utente in lista d'attesa",
    message: `Un utente è entrato nella lista d'attesa della tua partita "${match.title}". Posizione: ${position}.`,
    matchId: match.id,
    waitlistEntryId: waitlistEntry.id,
  });

  return waitlistEntry;
}

async function reserveNextWaitlistUser(matchId, tx = prisma) {
  const nextEntry = await tx.waitlistEntry.findFirst({
    where: {
      matchId,
      status: "WAITING",
    },
    orderBy: {
      position: "asc",
    },
    include: {
      match: {
        select: {
          id: true,
          title: true,
          creatorId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!nextEntry) {
    await tx.match.update({
      where: {
        id: matchId,
      },
      data: {
        status: "OPEN",
      },
    });

    return null;
  }

  const reservedExpiresAt = getReservedExpiresAt();

  const reservedEntry = await tx.waitlistEntry.update({
    where: {
      id: nextEntry.id,
    },
    data: {
      status: "RESERVED",
      reservedExpiresAt,
    },
    include: {
      match: {
        select: {
          id: true,
          title: true,
          creatorId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await tx.match.update({
    where: {
      id: matchId,
    },
    data: {
      status: "FULL",
    },
  });

  await tx.notification.create({
    data: {
      userId: reservedEntry.userId,
      type: "WAITLIST_RESERVED",
      title: "Posto riservato",
      message: `Si è liberato un posto per la partita "${reservedEntry.match.title}". Hai 1 ora per confermare la presenza dalla sezione Le mie partite.`,
      matchId,
      waitlistEntryId: reservedEntry.id,
    },
  });

  return reservedEntry;
}

async function expireReservedEntryAndReserveNext(waitlistEntry) {
  await prisma.$transaction(async (tx) => {
    await tx.waitlistEntry.update({
      where: {
        id: waitlistEntry.id,
      },
      data: {
        status: "EXPIRED",
        reservedExpiresAt: null,
      },
    });

    await reserveNextWaitlistUser(waitlistEntry.matchId, tx);
  });
}

async function declineReservedSpot({ userId, waitlistEntryId }) {
  const waitlistEntry = await waitlistRepository.findWaitlistEntryById(
    waitlistEntryId
  );

  if (!waitlistEntry) {
    throw new AppError("Waitlist entry not found", 404);
  }

  if (waitlistEntry.userId !== userId) {
    throw new AppError("You cannot decline this waitlist entry", 403);
  }

  if (waitlistEntry.status !== "RESERVED") {
    throw new AppError(
      "Puoi rifiutare solo un posto attualmente riservato",
      400
    );
  }

  const match = waitlistEntry.match;

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedEntry = await tx.waitlistEntry.update({
      where: {
        id: waitlistEntry.id,
      },
      data: {
        status: "EXPIRED",
        reservedExpiresAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
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

    let nextReservedEntry = null;

    if (match.status !== "CANCELLED" && match.status !== "COMPLETED") {
      nextReservedEntry = await reserveNextWaitlistUser(match.id, tx);
    }

    return {
      waitlistEntry: updatedEntry,
      nextReservedEntry,
    };
  });

  await notificationsService.createNotification({
    userId,
    type: "WAITLIST_RESERVATION_DECLINED",
    title: "Posto riservato liberato",
    message: `Hai rifiutato il posto riservato per la partita "${match.title}". Il posto è stato liberato.`,
    matchId: match.id,
    waitlistEntryId: waitlistEntry.id,
  });

  await notificationsService.createNotification({
    userId: match.creatorId,
    type: "WAITLIST_RESERVATION_DECLINED",
    title: "Posto riservato rifiutato",
    message: `${waitlistEntry.user?.name || waitlistEntry.user?.email || "Un utente"} ha rifiutato il posto riservato per la partita "${match.title}".`,
    matchId: match.id,
    waitlistEntryId: waitlistEntry.id,
  });

  return result;
}

async function getMatchWaitlist(matchId) {
  const match = await waitlistRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  return waitlistRepository.findWaitlistEntriesByMatchId(matchId);
}

async function getMyWaitlist(userId) {
  return waitlistRepository.findWaitlistEntriesByUserId(userId);
}

async function confirmPresence({ userId, waitlistEntryId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  await disciplinaryCardsService.ensureUserHasNoActiveRedCard(
    userId
  );

  const waitlistEntry = await waitlistRepository.findWaitlistEntryById(
    waitlistEntryId
  );

  if (!waitlistEntry) {
    throw new AppError("Waitlist entry not found", 404);
  }

  if (waitlistEntry.userId !== userId) {
    throw new AppError("You cannot confirm this waitlist entry", 403);
  }

  if (waitlistEntry.status !== "RESERVED") {
    throw new AppError("Reserved spot is not available for confirmation", 400);
  }

  if (isReservedEntryExpired(waitlistEntry)) {
    await expireReservedEntryAndReserveNext(waitlistEntry);

    throw new AppError(
      "Il tempo per confermare il posto è scaduto. Il posto è passato al prossimo utente in lista d'attesa.",
      400
    );
  }

  const match = waitlistEntry.match;

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const existingBooking = await waitlistRepository.findBookingByUserAndMatch(
    userId,
    match.id
  );

  if (existingBooking) {
    throw new AppError("You already joined this match", 400);
  }

  if (match.currentPlayers >= match.maxPlayers) {
    throw new AppError("Match is currently full", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    if (wallet.balance < match.depositAmount) {
      throw new AppError(
        "Saldo wallet insufficiente per bloccare la cauzione",
        400
      );
    }

    await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: {
          decrement: match.depositAmount,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -match.depositAmount,
        type: "DEPOSIT_HELD",
        reason: `Cauzione partita ${match.id} da lista d'attesa`,
      },
    });

    const newCurrentPlayers = match.currentPlayers + 1;
    const newStatus = newCurrentPlayers >= match.maxPlayers ? "FULL" : "OPEN";

    const booking = await tx.booking.create({
      data: {
        userId,
        matchId: match.id,
        status: "ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PENDING",
        depositStatus: "HELD",
        attendanceStatus: "NOT_CONFIRMED",
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

    await tx.waitlistEntry.update({
      where: {
        id: waitlistEntryId,
      },
      data: {
        status: "CONFIRMED",
        reservedExpiresAt: null,
      },
    });

    await tx.match.update({
      where: {
        id: match.id,
      },
      data: {
        currentPlayers: newCurrentPlayers,
        status: newStatus,
      },
    });

    return booking;
  });

  await notificationsService.createNotification({
    userId,
    type: "BOOKING_CONFIRMED",
    title: "Presenza confermata",
    message: `Hai confermato il posto riservato per la partita "${match.title}". Cauzione bloccata: ${match.depositAmount}€.`,
    matchId: match.id,
    bookingId: result.id,
    waitlistEntryId: waitlistEntry.id,
  });

  await notificationsService.createNotification({
    userId: match.creatorId,
    type: "MATCH_NEW_BOOKING",
    title: "Posto riservato confermato",
    message: `${result.user.name} ha confermato il posto riservato per la partita "${match.title}".`,
    matchId: match.id,
    bookingId: result.id,
    waitlistEntryId: waitlistEntry.id,
  });

  return result;
}

module.exports = {
  joinWaitlist,
  reserveNextWaitlistUser,
  getMatchWaitlist,
  getMyWaitlist,
  confirmPresence,
  declineReservedSpot,
};
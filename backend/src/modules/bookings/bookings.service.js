const bookingsRepository = require("./bookings.repository");
const matchesRepository = require("../matches/matches.repository");
const notificationsService = require("../notifications/notifications.service");
const waitlistService = require("../waitlist/waitlist.service");
const { AppError } = require("../../shared/errors");
const { prisma } = require("../../shared/prisma");
const suspensionService = require("../../shared/suspension.service");
const stripeService = require('../../shared/stripe.service');

const MAX_GOALKEEPERS_PER_MATCH = 2;
const LATE_CANCEL_PENALTY_POINTS = 3;
const PAYMENT_WINDOW_HOURS = 3;

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

  const goalkeeperCount = await countPlayersByRole(db, match, "PORTIERE");

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

function isPaymentWindowOpen(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  const paymentOpenAt = new Date(
    startsAt.getTime() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
  );

  return now >= paymentOpenAt && now <= startsAt;
}

function ensurePaymentWindowIsOpen(match) {
  if (!isPaymentWindowOpen(match)) {
    throw new AppError(
      "Il pagamento sarà disponibile solo nelle 3 ore prima della partita",
      400
    );
  }
}

function ensureCanLeaveMatch(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  const leaveDeadline = new Date(
    startsAt.getTime() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
  );

  if (now >= leaveDeadline) {
    throw new AppError(
      "Non puoi più uscire dalla partita nelle 3 ore prima dell’inizio",
      400
    );
  }
}

function ensureMatchHasStartedForAttendance(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  if (Number.isNaN(startsAt.getTime())) {
    throw new AppError("Data di inizio partita non valida", 400);
  }

  if (now < startsAt) {
    throw new AppError(
      "Puoi gestire presenze e assenze solo quando la partita è iniziata",
      400
    );
  }
}

function ensureAttendanceIsStillManageable(booking) {
  if (
    booking.attendanceStatus === "PRESENT" ||
    booking.attendanceStatus === "NO_SHOW" ||
    booking.attendanceStatus === "LATE_CANCELLED"
  ) {
    throw new AppError("La presenza di questo booking è già stata chiusa", 400);
  }
}

function getExistingBookingBlockReason(existingBooking) {
  if (!existingBooking) {
    return null;
  }

  if (existingBooking.status === "ACTIVE") {
    return "Sei già iscritto a questa partita";
  }

  if (existingBooking.status === "CANCELLED") {
    return "Sei già entrato in questa partita oppure sei uscito: non puoi rientrare";
  }

  if (existingBooking.status === "LATE_CANCELLED") {
    return "Hai già usato l’uscita di emergenza per questa partita: non puoi rientrare";
  }

  return "Hai già avuto una prenotazione per questa partita: non puoi rientrare";
}

async function getOrCreateWallet(tx, userId) {
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

  return wallet;
}

async function refundDepositIfHeld(tx, booking) {
  if (booking.depositStatus !== "HELD") {
    return;
  }

  const wallet = await getOrCreateWallet(tx, booking.userId);

  await tx.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      balance: {
        increment: booking.match.depositAmount,
      },
    },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: booking.match.depositAmount,
      type: "DEPOSIT_REFUND",
      reason: `Rimborso cauzione partita ${booking.match.id}`,
    },
  });
}

async function joinMatch({ userId, matchId }) {
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
      "Devi impostare un ruolo preferito prima di partecipare a una partita",
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
    throw new AppError("Match is not open for bookings", 400);
  }

  if (match.requiresApproval) {
    throw new AppError(
      "This match requires approval. Send a join request instead.",
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
    throw new AppError(getExistingBookingBlockReason(existingBooking), 400);
  }

  const newCurrentPlayers = match.currentPlayers + 1;

  const newStatus =
    newCurrentPlayers >= match.maxPlayers ? "FULL" : match.status;

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, userId);

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
        reason: `Cauzione partita ${match.id}`,
      },
    });

    const booking = await tx.booking.create({
      data: {
        userId,
        matchId,
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
            guests: true,
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

    // --- CODICE NUOVO (SICURO E ATOMICO) ---
const updatedMatch = await tx.match.update({
  where: {
    id: matchId,
    currentPlayers: { lt: match.maxPlayers } // <-- IL TRUCCO: Questo check avviene direttamente nel DB
  },
  data: {
    currentPlayers: { increment: 1 }, // <-- Incrementa di 1 in modo sicuro
    status: (match.currentPlayers + 1) >= match.maxPlayers ? "FULL" : "OPEN"
  },
});

    return booking;
  });

  await notificationsService.createNotification({
    userId,
    type: "BOOKING_CONFIRMED",
    title: "Prenotazione confermata",
    message: `Ti sei iscritto alla partita "${match.title}". Cauzione bloccata: ${match.depositAmount}€.`,
    matchId: match.id,
    bookingId: result.id,
  });

  await notificationsService.createNotification({
    userId: match.creatorId,
    type: "MATCH_NEW_BOOKING",
    title: "Nuovo iscritto alla tua partita",
    message: `${result.user.name} si è iscritto alla tua partita "${match.title}". Ora ci sono ${newCurrentPlayers}/${match.maxPlayers} giocatori.`,
    matchId: match.id,
    bookingId: result.id,
  });

  return result;
}

async function payBookingWithWallet({ userId, bookingId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.userId !== userId) {
    throw new AppError("You cannot pay another user's booking", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  if (booking.paymentStatus === "PAID") {
    throw new AppError("Booking already paid", 400);
  }

  ensurePaymentWindowIsOpen(booking.match);

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, userId);

    if (wallet.balance < booking.match.pricePerPlayer) {
      throw new AppError("Saldo wallet insufficiente per pagare la partita", 400);
    }

    await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: {
          decrement: booking.match.pricePerPlayer,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -booking.match.pricePerPlayer,
        type: "PAYMENT",
        reason: `Pagamento partita ${booking.match.id}`,
      },
    });

    return tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        paymentMethod: "WALLET",
        paymentStatus: "PAID",
        depositStatus: "HELD",
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
      },
    });
  });

  return result;
}

async function chooseOnSitePayment({ userId, bookingId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.userId !== userId) {
    throw new AppError("You cannot update another user's booking", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  if (booking.paymentStatus === "PAID") {
    throw new AppError("Booking already paid", 400);
  }

  ensurePaymentWindowIsOpen(booking.match);

  return prisma.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      paymentMethod: "ON_SITE",
      paymentStatus: "PENDING",
      depositStatus: "HELD",
    },
    include: {
      match: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          reliabilityScore: true,
          preferredRole: true,
        },
      },
    },
  });
}

async function confirmAttendance({ organizerId, bookingId }) {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.match.creatorId !== organizerId) {
    throw new AppError("You cannot confirm this booking", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  ensureMatchHasStartedForAttendance(booking.match);
  ensureAttendanceIsStillManageable(booking);

  const result = await prisma.$transaction(async (tx) => {
    await refundDepositIfHeld(tx, booking);

    return tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        paymentStatus: "PAID",
        attendanceStatus: "PRESENT",
        depositStatus:
          booking.depositStatus === "HELD"
            ? "REFUNDED"
            : booking.depositStatus,
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
      },
    });
  });

  return result;
}

async function markNoShow({ organizerId, bookingId }) {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.match.creatorId !== organizerId) {
    throw new AppError("You cannot mark this booking as no-show", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  ensureMatchHasStartedForAttendance(booking.match);
  ensureAttendanceIsStillManageable(booking);

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: booking.userId,
      },
      data: {
        reliabilityScore: {
          decrement: 5,
        },
      },
    });

    await tx.penalty.create({
      data: {
        userId: booking.userId,
        matchId: booking.matchId,
        bookingId: booking.id,
        type: "NO_SHOW",
        points: -5,
        reason: "Utente assente alla partita",
      },
    });

    return tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        attendanceStatus: "NO_SHOW",
        depositStatus:
          booking.depositStatus === "HELD" ? "KEPT" : booking.depositStatus,
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
      },
    });
  });

  await notificationsService.createNotification({
    userId: booking.userId,
    type: "PENALTY_RECEIVED",
    title: "Penalità ricevuta",
    message: `Assenza registrata per la partita "${booking.match.title}". Hai perso 5 punti affidabilità.`,
    matchId: booking.match.id,
    bookingId: booking.id,
  });

  return result;
}

async function leaveBooking({ userId, bookingId }) {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.userId !== userId) {
    throw new AppError("You cannot leave another user's booking", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  ensureCanLeaveMatch(booking.match);

  const result = await prisma.$transaction(async (tx) => {
    await refundDepositIfHeld(tx, booking);

    const updatedBooking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CANCELLED",
        depositStatus:
          booking.depositStatus === "HELD"
            ? "REFUNDED"
            : booking.depositStatus,
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
      },
    });

    const newCurrentPlayers = Math.max(booking.match.currentPlayers - 1, 1);

    const reservedEntry = await waitlistService.reserveNextWaitlistUser(
      booking.matchId,
      tx
    );

    await tx.match.update({
      where: {
        id: booking.matchId,
      },
      data: {
        currentPlayers: newCurrentPlayers,
        status: reservedEntry ? "FULL" : "OPEN",
      },
    });

    return {
      booking: updatedBooking,
      reservedEntry,
    };
  });

  await notificationsService.createNotification({
    userId: booking.match.creatorId,
    type: "MATCH_NEW_BOOKING",
    title: "Un partecipante è uscito",
    message: `${booking.user.name || booking.user.email} è uscito dalla partita "${booking.match.title}".`,
    matchId: booking.match.id,
    bookingId: booking.id,
  });

  return result;
}

function ensureLateCancellationWindowIsOpen(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  const lateCancelOpenAt = new Date(
    startsAt.getTime() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
  );

  if (now < lateCancelOpenAt) {
    throw new AppError(
      "Puoi usare l’uscita di emergenza solo nelle 3 ore prima della partita",
      400
    );
  }

  if (now >= startsAt) {
    throw new AppError(
      "La partita è già iniziata. Non puoi più uscire dalla partita.",
      400
    );
  }
}

async function requestLateCancellation({ userId, bookingId, reason }) {
  const cleanReason = String(reason || "").trim();

  if (cleanReason.length < 10) {
    throw new AppError(
      "Inserisci una motivazione di almeno 10 caratteri",
      400
    );
  }

  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.userId !== userId) {
    throw new AppError("You cannot leave another user's booking", 403);
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking is not active", 400);
  }

  ensureLateCancellationWindowIsOpen(booking.match);

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: booking.userId,
      },
      data: {
        reliabilityScore: {
          decrement: LATE_CANCEL_PENALTY_POINTS,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        reliabilityScore: true,
      },
    });

    const penalty = await tx.penalty.create({
      data: {
        userId: booking.userId,
        matchId: booking.matchId,
        bookingId: booking.id,
        type: "LATE_CANCEL",
        points: -LATE_CANCEL_PENALTY_POINTS,
        reason: "Uscita di emergenza nelle ultime 3 ore",
      },
    });

    const updatedBooking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "LATE_CANCELLED",
        attendanceStatus: "LATE_CANCELLED",
        depositStatus:
          booking.depositStatus === "HELD"
            ? "KEPT"
            : booking.depositStatus,
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reliabilityScore: true,
            preferredRole: true,
          },
        },
      },
    });

    const newCurrentPlayers = Math.max(booking.match.currentPlayers - 1, 1);

    const reservedEntry = await waitlistService.reserveNextWaitlistUser(
      booking.matchId,
      tx
    );

    await tx.match.update({
      where: {
        id: booking.matchId,
      },
      data: {
        currentPlayers: newCurrentPlayers,
        status: reservedEntry ? "FULL" : "OPEN",
      },
    });

    return {
      booking: updatedBooking,
      penalty,
      user: updatedUser,
      reservedEntry,
    };
  });

  await notificationsService.createNotification({
    userId: booking.userId,
    type: "PENALTY_RECEIVED",
    title: "Uscita di emergenza registrata",
    message: `Sei uscito dalla partita "${booking.match.title}" nelle ultime 3 ore. Hai perso ${LATE_CANCEL_PENALTY_POINTS} punti affidabilità e la cauzione è stata trattenuta.`,
    matchId: booking.match.id,
    bookingId: booking.id,
    penaltyId: result.penalty.id,
  });

  await notificationsService.createNotification({
    userId: booking.match.creatorId,
    type: "LATE_CANCELLATION_CREATED",
    title: "Uscita di emergenza registrata",
    message: `${booking.user.name || booking.user.email} è uscito dalla partita "${booking.match.title}" nelle ultime 3 ore. Motivazione: "${cleanReason}". La cauzione è stata trattenuta automaticamente.`,
    matchId: booking.match.id,
    bookingId: booking.id,
  });

  return result;
}

async function removeGuestFromMatch({ organizerId, matchId, guestId }) {
  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  if (match.creatorId !== organizerId) {
    throw new AppError("You cannot remove guests from this match", 403);
  }

  const guest = await prisma.matchGuest.findUnique({
    where: {
      id: guestId,
    },
  });

  if (!guest || guest.matchId !== matchId) {
    throw new AppError("Guest not found", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.matchGuest.delete({
      where: {
        id: guestId,
      },
    });

    const freshMatch = await tx.match.findUnique({
      where: {
        id: matchId,
      },
      select: {
        currentPlayers: true,
      },
    });

    const newCurrentPlayers = Math.max((freshMatch?.currentPlayers || 1) - 1, 1);

    await tx.match.update({
      where: {
        id: matchId,
      },
      data: {
        currentPlayers: newCurrentPlayers,
      },
    });

    const reservedEntry = await waitlistService.reserveNextWaitlistUser(
      matchId,
      tx
    );

    return {
      removedGuest: guest,
      reservedEntry,
    };
  });

  return result;
}

async function getMatchBookings(matchId) {
  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  return bookingsRepository.findBookingsByMatchId(matchId);
}

async function getMyBookings(userId) {
  return bookingsRepository.findBookingsByUserId(userId);
}

async function getJoinSummary({ userId, matchId }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      preferredRole: true,
      reliabilityScore: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const match = await matchesRepository.findMatchById(matchId);

  if (!match) {
    throw new AppError("Match not found", 404);
  }

  const wallet = await getOrCreateWallet(prisma, userId);

  const existingBooking = await bookingsRepository.findBookingByUserAndMatch(
    userId,
    matchId
  );

  const currentBalance = wallet.balance;
  const depositAmount = match.depositAmount;
  const pricePerPlayer = match.pricePerPlayer;
  const balanceAfterDeposit = currentBalance - depositAmount;

  const isSuspended = suspensionService.isSuspensionActive(user);
  const isAdmin = user.role === "ADMIN";

  const requiresReliability = match.onlyReliableUsers === true;
  const minimumReliabilityScore = match.minReliabilityScore ?? 0;
  const userReliabilityScore = user.reliabilityScore ?? 0;

  const hasRequiredReliability =
    !requiresReliability || userReliabilityScore >= minimumReliabilityScore;

  const canJoin =
    !isAdmin &&
    !isSuspended &&
    match.creatorId !== userId &&
    match.status === "OPEN" &&
    !match.requiresApproval &&
    match.currentPlayers < match.maxPlayers &&
    !existingBooking &&
    Boolean(user.preferredRole) &&
    hasRequiredReliability &&
    currentBalance >= depositAmount;

  let reason = null;

  if (isAdmin) {
    reason = "Gli account admin non possono partecipare alle partite";
  } else if (isSuspended) {
    reason =
      "Il tuo account è sospeso dalle partite. Puoi usare l’app, ma non puoi creare o partecipare a partite.";
  } else if (match.creatorId === userId) {
    reason = "Sei già il creatore della partita";
  } else if (match.status !== "OPEN") {
    reason = "La partita non è aperta alle iscrizioni";
  } else if (match.requiresApproval) {
    reason = "Questa partita richiede approvazione";
  } else if (match.currentPlayers >= match.maxPlayers) {
    reason = "La partita è piena";
  } else if (existingBooking) {
    reason = getExistingBookingBlockReason(existingBooking);
  } else if (!user.preferredRole) {
    reason = "Devi impostare un ruolo preferito prima di partecipare";
  } else if (!hasRequiredReliability) {
    reason = `Affidabilità insufficiente. Questa partita richiede almeno ${minimumReliabilityScore} punti affidabilità. Il tuo punteggio attuale è ${userReliabilityScore}.`;
  } else if (currentBalance < depositAmount) {
    reason = "Saldo wallet insufficiente per bloccare la cauzione";
  }

  return {
    user,
    match,
    wallet: {
      id: wallet.id,
      balance: wallet.balance,
      userId: wallet.userId,
    },
    paymentSummary: {
      currentBalance,
      depositAmount,
      pricePerPlayer,
      balanceAfterDeposit,
      canJoin,
      reason,
      isSuspended,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
      requiresReliability,
      minimumReliabilityScore,
      userReliabilityScore,
      hasRequiredReliability,
    },
  };
}

/**
 * Crea un PaymentIntent per Stripe.
 * Restituisce il client_secret che servirà al frontend per mostrare il form di pagamento.
 */
async function createStripePaymentIntent({ userId, bookingId }) {
  // 1. Recuperiamo la prenotazione
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // 2. Controllo di sicurezza: l'utente deve essere il proprietario del booking
  if (booking.userId !== userId) {
    throw new AppError("Non puoi pagare la prenotazione di un altro utente", 403);
  }

  // 3. Verifichiamo che il pagamento sia possibile (stessi controlli di prima)
  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking non attivo", 400);
  }

  if (booking.paymentStatus === "PAID") {
    throw new AppError("Booking già pagato", 400);
  }

  // 4. Calcoliamo l'importo in centesimi (Stripe vuole i centesimi!)
  const amountInCents = Math.round(booking.match.pricePerPlayer * 100);

  // 5. Chiamiamo il nostro servizio Stripe
  const paymentIntent = await stripeService.createPaymentIntent(amountInCents, bookingId);

  // 6. Restituiamo il clientSecret al frontend
  return {
    clientSecret: paymentIntent.client_secret,
  };
}

module.exports = {
  getJoinSummary,
  joinMatch,
  getMatchBookings,
  getMyBookings,
  payBookingWithWallet,
  chooseOnSitePayment,
  confirmAttendance,
  markNoShow,
  leaveBooking,
  requestLateCancellation,
  removeGuestFromMatch,
  createStripePaymentIntent,
};
const bookingsRepository = require("./bookings.repository");
const matchesRepository = require("../matches/matches.repository");
const notificationsService = require("../notifications/notifications.service");
const waitlistService = require("../waitlist/waitlist.service");
const { AppError } = require("../../shared/errors");
const { prisma } = require("../../shared/prisma");
const suspensionService = require("../../shared/suspension.service");
const stripeService = require('../../shared/stripe.service');
const disciplinaryCardsService = require(
  "../disciplinary-cards/disciplinary-cards.service"
);
const {
  DISCIPLINARY_RULES,
} = require("../../config/disciplinary-rules");

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

  return now < startsAt;
}

function ensurePaymentWindowIsOpen(match) {
  if (!isPaymentWindowOpen(match)) {
    throw new AppError(
      "Non puoi effettuare il pagamento dopo l’inizio della partita",
      400
    );
  }
}

function ensureCanLeaveMatch(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  const emergencyExitOpenAt = new Date(
    startsAt.getTime() -
      DISCIPLINARY_RULES.lateCancellationWindowMinutes * 60 * 1000
  );

  if (now >= startsAt) {
    throw new AppError(
      "La partita è già iniziata. Non puoi più uscire.",
      400
    );
  }

  if (now >= emergencyExitOpenAt) {
    throw new AppError(
      "Nell’ultima ora puoi uscire soltanto tramite l’uscita di emergenza",
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

async function joinMatch({ userId, matchId }) {
  await suspensionService.ensureUserCanUseMatchFeatures(userId);

  await disciplinaryCardsService.ensureUserHasNoActiveRedCard(
    userId
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, preferredRole: true, reliabilityScore: true },
  });

  if (!user || !user.preferredRole) {
    throw new AppError("Utente non trovato o ruolo preferito non impostato", 400);
  }

  const match = await matchesRepository.findMatchById(matchId);
  if (!match || match.status !== "OPEN") {
    throw new AppError("Partita non trovata o non aperta", 400);
  }

  if (match.creatorId === userId) {
    throw new AppError("Sei già il creatore", 400);
  }

  // --- LOGICA NUOVA: Cancello Dinamico ---
  // Invece di bloccare, controlliamo l'affidabilità
  const isReliable = user.reliabilityScore >= 70; // Soglia soggettiva, puoi cambiarla
  
  // Se la partita richiede approvazione (Premium) O l'utente è poco affidabile -> Status PENDING
  // Se l'utente è affidabile -> Status ACTIVE
  const statusToSet = (match.requiresApproval || !isReliable) ? "PENDING" : "ACTIVE";

  ensureReliabilityRequirement(match, user);
  await ensureRoleCapacity(prisma, match, user.preferredRole);

  const existingBooking = await bookingsRepository.findBookingByUserAndMatch(userId, matchId);
  if (existingBooking) throw new AppError(getExistingBookingBlockReason(existingBooking), 400);

  const result = await prisma.$transaction(async (tx) => {
    // --- RIMOSSO: Blocco Wallet e Transazione Cauzione ---

    const booking = await tx.booking.create({
      data: {
        userId,
        matchId,
        status: statusToSet, // Ora può essere PENDING o ACTIVE
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PENDING",
        depositStatus: "NONE", // Nessuna cauzione trattenuta
        attendanceStatus: "NOT_CONFIRMED",
      },
      include: { /* ... resto degli include invariato ... */ },
    });

    const updatedMatch = await tx.match.update({
      where: { id: matchId, currentPlayers: { lt: match.maxPlayers } },
      data: { currentPlayers: { increment: 1 }, status: (match.currentPlayers + 1) >= match.maxPlayers ? "FULL" : "OPEN" },
    });

    return booking;
  });

  // Notifiche (Aggiorna il messaggio per riflettere che non c'è cauzione)
  await notificationsService.createNotification({
    userId,
    type: "BOOKING_CONFIRMED",
    title: statusToSet === "ACTIVE" ? "Iscrizione confermata" : "Richiesta inviata",
    message: statusToSet === "ACTIVE" ? `Ti sei iscritto alla partita "${match.title}".` : "La tua richiesta è in attesa di approvazione.",
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
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.match.creatorId !== organizerId) throw new AppError("Non autorizzato", 403);
  if (booking.status !== "ACTIVE") throw new AppError("Booking non attivo", 400);

  ensureMatchHasStartedForAttendance(booking.match);
  ensureAttendanceIsStillManageable(booking);

  // Qui non rimborsiamo più nulla perché non c'è cauzione
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID",
      attendanceStatus: "PRESENT",
      depositStatus: "NONE", // Segniamo come concluso senza nulla in ballo
    },
    include: { match: true, user: true },
  });
}

async function markNoShow({ organizerId, bookingId }) {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new AppError("Booking non trovato", 404);
  }

  if (booking.match.creatorId !== organizerId) {
    throw new AppError(
      "Non sei autorizzato a segnare questa assenza",
      403
    );
  }

  if (booking.status !== "ACTIVE") {
    throw new AppError("Booking non attivo", 400);
  }

  ensureMatchHasStartedForAttendance(booking.match);
  ensureAttendanceIsStillManageable(booking);

  const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        attendanceStatus: "NO_SHOW",

        /*
         * Questo campo appartiene ancora al vecchio schema.
         * Lo manteniamo temporaneamente neutro finché non verrà
         * eliminato con la migrazione dedicata alla cauzione.
         */
        depositStatus: "NONE",
      },
      include: {
        match: true,
        user: true,
      },
    });

    const redCardResult =
      await disciplinaryCardsService.issueRedCard({
        recipientId: booking.userId,
        issuedById: organizerId,
        matchId: booking.matchId,
        bookingId: booking.id,
        reason:
          disciplinaryCardsService.CARD_REASONS.NO_SHOW,
        note: `Assenza registrata alla partita "${booking.match.title}"`,
        db: tx,
      });

    return {
      booking: updatedBooking,
      redCard: redCardResult.card,
      redCardAlreadyExisted:
        redCardResult.alreadyExisted,
    };
  });

  await notificationsService.createNotification({
    userId: booking.userId,
    type: "RED_CARD_RECEIVED",
    title: "Cartellino rosso ricevuto",
    message:
      `Sei stato segnato assente alla partita ` +
      `"${booking.match.title}". Hai ricevuto un cartellino rosso ` +
      "e non puoi creare o partecipare a partite finché resterà attivo.",
    matchId: booking.match.id,
    bookingId: booking.id,
  });

  return result;
}

async function leaveBooking({ userId, bookingId }) {
  const booking = await bookingsRepository.findBookingById(bookingId);
  if (!booking || booking.userId !== userId || booking.status !== "ACTIVE") {
     throw new AppError("Operazione non valida", 400);
  }

  ensureCanLeaveMatch(booking.match);

  // Rimosso refundDepositIfHeld
  return prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", depositStatus: "NONE" },
      include: { match: true, user: true },
    });

    // ... (logica aggiornamento currentPlayers rimane invariata)
    return { booking: updatedBooking };
  });
}

function ensureLateCancellationWindowIsOpen(match) {
  const startsAt = new Date(match.startsAt);
  const now = new Date();

  const emergencyExitOpenAt = new Date(
    startsAt.getTime() -
      DISCIPLINARY_RULES.lateCancellationWindowMinutes * 60 * 1000
  );

  if (now < emergencyExitOpenAt) {
    throw new AppError(
      "L’uscita di emergenza è disponibile soltanto nell’ultima ora prima della partita",
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

async function requestLateCancellation({
  userId,
  bookingId,
  reason,
}) {
  const cleanReason = String(reason || "").trim();

  /*
   * Manteniamo temporaneamente obbligatoria la motivazione.
   * La relativa esperienza utente verrà rivalutata più avanti.
   */
  if (cleanReason.length < 10) {
    throw new AppError(
      "Inserisci una motivazione di almeno 10 caratteri",
      400
    );
  }

  const booking = await bookingsRepository.findBookingById(
    bookingId
  );

  if (
    !booking ||
    booking.userId !== userId ||
    booking.status !== "ACTIVE"
  ) {
    throw new AppError("Operazione non valida", 400);
  }

  ensureLateCancellationWindowIsOpen(booking.match);

  const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "LATE_CANCELLED",
        attendanceStatus: "LATE_CANCELLED",

        /*
         * Campo residuo del vecchio sistema della cauzione.
         * Verrà eliminato nella migrazione dedicata.
         */
        depositStatus: "NONE",
      },
      include: {
        match: true,
        user: true,
      },
    });

    const yellowCardResult =
      await disciplinaryCardsService.issueYellowCard({
        recipientId: booking.userId,
        matchId: booking.matchId,
        bookingId: booking.id,
        reason:
          disciplinaryCardsService.CARD_REASONS
            .LATE_CANCELLATION,
        note: cleanReason,
        db: tx,
      });

    const newCurrentPlayers = Math.max(
      booking.match.currentPlayers - 1,
      1
    );

    const reservedEntry =
      await waitlistService.reserveNextWaitlistUser(
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
      yellowCard: yellowCardResult.yellowCard,
      redCard: yellowCardResult.redCard,
      convertedToRed: yellowCardResult.convertedToRed,
      reservedEntry,
    };
  });

  const notificationTitle = result.convertedToRed
    ? "Cartellino rosso ricevuto"
    : "Cartellino giallo ricevuto";

  const notificationType = result.convertedToRed
    ? "RED_CARD_RECEIVED"
    : "YELLOW_CARD_RECEIVED";

  const notificationMessage = result.convertedToRed
    ? `Sei uscito dalla partita "${booking.match.title}" nell’ultima ora. Hai ricevuto il secondo cartellino giallo attivo, convertito automaticamente in cartellino rosso.`
    : `Sei uscito dalla partita "${booking.match.title}" nell’ultima ora e hai ricevuto un cartellino giallo.`;

  await notificationsService.createNotification({
    userId: booking.userId,
    type: notificationType,
    title: notificationTitle,
    message: notificationMessage,
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
    where: { id: userId },
    select: { id: true, name: true, preferredRole: true, reliabilityScore: true } 
  });
  
  const match = await matchesRepository.findMatchById(matchId);

  if (!match) throw new AppError("Partita non trovata", 404);
  if (!user) throw new AppError("Utente non trovato", 404);

  const existingBooking = await bookingsRepository.findBookingByUserAndMatch(userId, matchId);
  const isSuspended = suspensionService.isSuspensionActive(user);
  
  const canJoin = !isSuspended && match.creatorId !== userId && match.status === "OPEN" && match.currentPlayers < match.maxPlayers && !existingBooking && Boolean(user.preferredRole);

  // Inviamo sempre lo stesso oggetto strutturato
  return {
    match,
    paymentSummary: {
      canJoin,
      reason: canJoin ? null : "Non puoi partecipare"
    }
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
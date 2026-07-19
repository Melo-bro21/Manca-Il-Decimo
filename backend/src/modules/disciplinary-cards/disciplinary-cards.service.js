const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const {
  DISCIPLINARY_RULES,
} = require("../../config/disciplinary-rules");

const CARD_TYPES = Object.freeze({
  YELLOW: "YELLOW",
  RED: "RED",
});

const CARD_REASONS = Object.freeze({
  LATE_CANCELLATION: "LATE_CANCELLATION",
  NO_SHOW: "NO_SHOW",
  DOUBLE_YELLOW: "DOUBLE_YELLOW",
  ADMINISTRATIVE: "ADMINISTRATIVE",
});

const CARD_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
});

function addDays(date, days) {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function normalizeRequiredId(value, fieldName = "identificativo") {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} non valido`, 400);
  }

  return parsed;
}

function normalizeOptionalId(value, fieldName = "identificativo") {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeRequiredId(value, fieldName);
}

/**
 * Chiude i cartellini che risultano ancora ACTIVE ma la cui
 * data di scadenza è già trascorsa.
 *
 * Può ricevere sia PrismaClient sia un transaction client.
 */
async function expireElapsedCards({ recipientId, db = prisma }) {
  const now = new Date();

  return db.disciplinaryCard.updateMany({
    where: {
      recipientId,
      status: CARD_STATUSES.ACTIVE,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: CARD_STATUSES.EXPIRED,
    },
  });
}

async function getActiveCardsForUser({ recipientId, db = prisma }) {
  await expireElapsedCards({
    recipientId,
    db,
  });

  return db.disciplinaryCard.findMany({
    where: {
      recipientId,
      status: CARD_STATUSES.ACTIVE,
    },
    orderBy: [
      {
        issuedAt: "desc",
      },
      {
        id: "desc",
      },
    ],
  });
}

async function getDisciplinaryState(userId, db = prisma) {
  const recipientId = normalizeRequiredId(userId, "ID utente");

  const user = await db.user.findUnique({
    where: {
      id: recipientId,
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError("Utente non trovato", 404);
  }

  const activeCards = await getActiveCardsForUser({
    recipientId,
    db,
  });

  const activeYellowCards = activeCards.filter(
    (card) => card.type === CARD_TYPES.YELLOW,
  );

  const activeRedCards = activeCards.filter(
    (card) => card.type === CARD_TYPES.RED,
  );

  return {
    user,
    activeCards,
    activeYellowCards,
    activeRedCards,
    hasActiveYellowCard: activeYellowCards.length > 0,
    hasActiveRedCard: activeRedCards.length > 0,
    nearestRedCardExpiry:
      activeRedCards
        .map((card) => card.expiresAt)
        .filter(Boolean)
        .sort((first, second) => first.getTime() - second.getTime())[0] ||
      null,
  };
}

function formatDateTime(date) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/**
 * Impedisce l'accesso alle funzioni legate alle partite
 * quando esiste un rosso attivo.
 */
async function ensureUserHasNoActiveRedCard(userId, db = prisma) {
  const state = await getDisciplinaryState(userId, db);

  if (!state.hasActiveRedCard) {
    return state;
  }

  const expiryLabel = formatDateTime(state.nearestRedCardExpiry);

  const message = expiryLabel
    ? `Hai un cartellino rosso attivo. Non puoi creare o partecipare a partite fino al ${expiryLabel}.`
    : "Hai un cartellino rosso attivo. Non puoi creare o partecipare a partite.";

  throw new AppError(message, 403);
}

async function createRedCardWithDb({
  recipientId,
  issuedById = null,
  matchId = null,
  bookingId = null,
  reason,
  note = null,
  sourceYellowCardIds = [],
  db,
}) {
  const issuedAt = new Date();
  const expiresAt = addDays(
    issuedAt,
    DISCIPLINARY_RULES.redCardDurationDays,
  );

  return db.disciplinaryCard.create({
    data: {
      type: CARD_TYPES.RED,
      reason,
      status: CARD_STATUSES.ACTIVE,
      note,
      issuedAt,
      expiresAt,
      recipientId,
      issuedById,
      matchId,
      bookingId,
      sourceYellowCardIds,
    },
  });
}

/**
 * Assegna un rosso diretto, per esempio in caso di no-show.
 */
async function issueRedCard({
  recipientId,
  issuedById = null,
  matchId = null,
  bookingId = null,
  reason = CARD_REASONS.NO_SHOW,
  note = null,
  db = prisma,
}) {
const normalizedRecipientId = normalizeRequiredId(
  recipientId,
  "ID destinatario",
);

const normalizedIssuerId = normalizeOptionalId(
  issuedById,
  "ID autore",
);

const normalizedMatchId = normalizeOptionalId(
  matchId,
  "ID partita",
);

const normalizedBookingId = normalizeOptionalId(
  bookingId,
  "ID prenotazione",
);

  const operation = async (transaction) => {
    await expireElapsedCards({
      recipientId: normalizedRecipientId,
      db: transaction,
    });

    const existingRedCard =
      await transaction.disciplinaryCard.findFirst({
        where: {
          recipientId: normalizedRecipientId,
          type: CARD_TYPES.RED,
          status: CARD_STATUSES.ACTIVE,
        },
        orderBy: {
          issuedAt: "desc",
        },
      });

    /*
     * Evitiamo rossi duplicati per la stessa azione.
     * Un no-show non deve creare più cartellini se l'endpoint
     * viene richiamato due volte.
     */
    if (
      existingRedCard &&
      normalizedBookingId &&
      existingRedCard.bookingId === normalizedBookingId
    ) {
      return {
        card: existingRedCard,
        alreadyExisted: true,
      };
    }

    const card = await createRedCardWithDb({
      recipientId: normalizedRecipientId,
      issuedById: normalizedIssuerId,
      matchId: normalizedMatchId,
      bookingId: normalizedBookingId,
      reason,
      note,
      db: transaction,
    });

    return {
      card,
      alreadyExisted: false,
    };
  };

  if (db === prisma) {
    return prisma.$transaction(operation);
  }

  return operation(db);
}

/**
 * Assegna un giallo.
 *
 * Se esiste già un altro giallo attivo:
 * - salva comunque il nuovo giallo nello storico;
 * - converte i due gialli in EXPIRED;
 * - genera automaticamente un rosso DOUBLE_YELLOW.
 */
async function issueYellowCard({
  recipientId,
  issuedById = null,
  matchId = null,
  bookingId = null,
  reason = CARD_REASONS.LATE_CANCELLATION,
  note = null,
  db = prisma,
}) {
const normalizedRecipientId = normalizeRequiredId(
  recipientId,
  "ID destinatario",
);

const normalizedIssuerId = normalizeOptionalId(
  issuedById,
  "ID autore",
);

const normalizedMatchId = normalizeOptionalId(
  matchId,
  "ID partita",
);

const normalizedBookingId = normalizeOptionalId(
  bookingId,
  "ID prenotazione",
);

  const operation = async (transaction) => {
    await expireElapsedCards({
      recipientId: normalizedRecipientId,
      db: transaction,
    });

    /*
     * Protezione da doppia richiesta HTTP per lo stesso booking.
     */
    if (normalizedBookingId) {
      const existingBookingCard =
        await transaction.disciplinaryCard.findFirst({
          where: {
            recipientId: normalizedRecipientId,
            bookingId: normalizedBookingId,
            type: CARD_TYPES.YELLOW,
            reason,
          },
          orderBy: {
            issuedAt: "desc",
          },
        });

      if (existingBookingCard) {
        return {
          yellowCard: existingBookingCard,
          redCard: null,
          convertedToRed: false,
          alreadyExisted: true,
        };
      }
    }

    const previousActiveYellow =
      await transaction.disciplinaryCard.findFirst({
        where: {
          recipientId: normalizedRecipientId,
          type: CARD_TYPES.YELLOW,
          status: CARD_STATUSES.ACTIVE,
        },
        orderBy: {
          issuedAt: "asc",
        },
      });

    const issuedAt = new Date();
    const expiresAt = addDays(
      issuedAt,
      DISCIPLINARY_RULES.yellowCardDurationDays,
    );

    const yellowCard = await transaction.disciplinaryCard.create({
      data: {
        type: CARD_TYPES.YELLOW,
        reason,
        status: CARD_STATUSES.ACTIVE,
        note,
        issuedAt,
        expiresAt,
        recipientId: normalizedRecipientId,
        issuedById: normalizedIssuerId,
        matchId: normalizedMatchId,
        bookingId: normalizedBookingId,
      },
    });

    if (!previousActiveYellow) {
      return {
        yellowCard,
        redCard: null,
        convertedToRed: false,
        alreadyExisted: false,
      };
    }

    const sourceYellowCardIds = [
      previousActiveYellow.id,
      yellowCard.id,
    ];

    await transaction.disciplinaryCard.updateMany({
      where: {
        id: {
          in: sourceYellowCardIds,
        },
        status: CARD_STATUSES.ACTIVE,
      },
      data: {
        status: CARD_STATUSES.EXPIRED,
      },
    });

    const redCard = await createRedCardWithDb({
      recipientId: normalizedRecipientId,
      issuedById: normalizedIssuerId,
      matchId: normalizedMatchId,
      bookingId: normalizedBookingId,
      reason: CARD_REASONS.DOUBLE_YELLOW,
      note: "Cartellino rosso automatico per doppia ammonizione",
      sourceYellowCardIds,
      db: transaction,
    });

    return {
      yellowCard,
      redCard,
      convertedToRed: true,
      alreadyExisted: false,
    };
  };

  if (db === prisma) {
    return prisma.$transaction(operation);
  }

  return operation(db);
}

/**
 * Revoca amministrativa di un cartellino.
 */
async function revokeCard({
  cardId,
  revokedReason,
  db = prisma,
}) {
  const normalizedCardId = normalizeRequiredId(
  cardId,
  "ID cartellino",
);
  const cleanReason = String(revokedReason || "").trim();

  if (cleanReason.length < 5) {
    throw new AppError(
      "Inserisci una motivazione di revoca valida",
      400,
    );
  }

  const card = await db.disciplinaryCard.findUnique({
    where: {
      id: normalizedCardId,
    },
  });

  if (!card) {
    throw new AppError("Cartellino non trovato", 404);
  }

  if (card.status !== CARD_STATUSES.ACTIVE) {
    throw new AppError(
      "Il cartellino non è più attivo",
      400,
    );
  }

  return db.disciplinaryCard.update({
    where: {
      id: normalizedCardId,
    },
    data: {
      status: CARD_STATUSES.REVOKED,
      revokedAt: new Date(),
      revokedReason: cleanReason,
    },
  });
}

module.exports = {
  CARD_TYPES,
  CARD_REASONS,
  CARD_STATUSES,
  expireElapsedCards,
  getActiveCardsForUser,
  getDisciplinaryState,
  ensureUserHasNoActiveRedCard,
  issueYellowCard,
  issueRedCard,
  revokeCard,
};
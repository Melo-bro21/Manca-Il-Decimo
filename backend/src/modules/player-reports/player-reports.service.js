const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");

const REPORT_REASONS = [
  "OFFENSIVE_BEHAVIOR",
  "THREATS_AGGRESSION",
  "DISCRIMINATION",
  "HARASSMENT",
  "SERIOUS_UNSPORTSMANLIKE",
  "PROPERTY_DAMAGE",
  "OTHER",
];

const REPORT_REASON_LABELS = {
  OFFENSIVE_BEHAVIOR: "Comportamento offensivo",
  THREATS_AGGRESSION: "Minacce o aggressività",
  DISCRIMINATION: "Discriminazione",
  HARASSMENT: "Molestie",
  SERIOUS_UNSPORTSMANLIKE: "Comportamento antisportivo grave",
  PROPERTY_DAMAGE: "Danni alla struttura",
  OTHER: "Altro",
};

const VALID_SUSPENSION_DAYS = [1, 3, 7, 30, 365];

function getMatchEndDate(match) {
  return new Date(
    new Date(match.startsAt).getTime() + match.durationMinutes * 60 * 1000
  );
}

function hasMatchEnded(match) {
  if (match.status === "COMPLETED") {
    return true;
  }

  return getMatchEndDate(match) <= new Date();
}

function normalizeReason(reason) {
  return String(reason || "").trim().toUpperCase();
}

function cleanDescription(description) {
  const value = String(description || "").trim();

  return value.length > 0 ? value : null;
}

function getSuspensionUntil(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function getMatchManagement({ userId, matchId }) {
  const match = await prisma.match.findUnique({
    where: {
      id: matchId,
    },
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
      bookings: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              preferredRole: true,
              reliabilityScore: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!match) {
    throw new AppError("Partita non trovata", 404);
  }

  if (match.creatorId !== userId) {
    throw new AppError("Non puoi gestire questa partita", 403);
  }

  const ended = hasMatchEnded(match);
  const cancelled = match.status === "CANCELLED";

  return {
    match: {
      id: match.id,
      title: match.title,
      startsAt: match.startsAt,
      durationMinutes: match.durationMinutes,
      status: match.status,
      field: match.field,
    },
    canReport: ended && !cancelled,
    reportReasons: REPORT_REASONS.map((value) => {
      return {
        value,
        label: REPORT_REASON_LABELS[value],
      };
    }),
    participants: match.bookings.map((booking) => {
      return {
        bookingId: booking.id,
        user: booking.user,
        attendanceStatus: booking.attendanceStatus,
      };
    }),
  };
}

async function createPlayerReport({
  reporterId,
  matchId,
  reportedUserId,
  reason,
  description,
}) {
  if (!reportedUserId || Number.isNaN(reportedUserId)) {
    throw new AppError("Utente segnalato non valido", 400);
  }

  if (reportedUserId === reporterId) {
    throw new AppError("Non puoi segnalare te stesso", 400);
  }

  const normalizedReason = normalizeReason(reason);
  const cleanedDescription = cleanDescription(description);

  if (!REPORT_REASONS.includes(normalizedReason)) {
    throw new AppError("Motivo segnalazione non valido", 400);
  }

  if (normalizedReason === "OTHER" && !cleanedDescription) {
    throw new AppError(
      "Inserisci una descrizione per spiegare il motivo della segnalazione",
      400
    );
  }

  const match = await prisma.match.findUnique({
    where: {
      id: matchId,
    },
    include: {
      bookings: {
        where: {
          status: "ACTIVE",
        },
        select: {
          userId: true,
        },
      },
    },
  });

  if (!match) {
    throw new AppError("Partita non trovata", 404);
  }

  if (match.creatorId !== reporterId) {
    throw new AppError("Solo il creatore della partita può segnalare utenti", 403);
  }

  if (!hasMatchEnded(match)) {
    throw new AppError("Puoi segnalare utenti solo dopo la fine della partita", 400);
  }

  if (match.status === "CANCELLED") {
    throw new AppError("Non puoi segnalare utenti per una partita cancellata", 400);
  }

  const isRealParticipant = match.bookings.some((booking) => {
    return booking.userId === reportedUserId;
  });

  if (!isRealParticipant) {
    throw new AppError(
      "Puoi segnalare solo utenti reali iscritti alla partita",
      400
    );
  }

  try {
    return await prisma.playerReport.create({
      data: {
        matchId,
        reporterId,
        reportedUserId,
        reason: normalizedReason,
        description: cleanedDescription,
        status: "OPEN",
      },
      include: getReportInclude(),
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError(
        "Hai già inviato una segnalazione per questo utente in questa partita",
        400
      );
    }

    throw error;
  }
}

function getReportInclude() {
  return {
    match: {
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true,
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
    reporter: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    reportedUser: {
      select: {
        id: true,
        name: true,
        email: true,
        reliabilityScore: true,
        suspendedUntil: true,
        suspensionReason: true,
      },
    },
    resolvedByAdmin: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

async function getAdminReports({ status }) {
  const normalizedStatus = status ? String(status).trim().toUpperCase() : null;

  const allowedStatuses = ["OPEN", "RESOLVED", "IGNORED"];

  if (normalizedStatus && !allowedStatuses.includes(normalizedStatus)) {
    throw new AppError("Stato segnalazione non valido", 400);
  }

  return prisma.playerReport.findMany({
    where: normalizedStatus
      ? {
          status: normalizedStatus,
        }
      : undefined,
    include: getReportInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function ignoreReport({ adminId, reportId }) {
  const existingReport = await prisma.playerReport.findUnique({
    where: { id: reportId },
    include: {
      match: true,
      reportedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!existingReport) {
    throw new AppError("Segnalazione non trovata", 404);
  }

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.playerReport.update({
      where: { id: reportId },
      data: {
        status: "IGNORED",
        adminNote: null,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
      include: getReportInclude(),
    });

    const reportedName =
      existingReport.reportedUser.name || existingReport.reportedUser.email;

    await tx.notification.create({
      data: {
        userId: existingReport.reporterId,
        type: "REPORT_IGNORED",
        title: "Segnalazione archiviata",
        message: `La tua segnalazione su ${reportedName} per la partita "${existingReport.match.title}" è stata valutata e archiviata senza azioni.`,
      },
    });

    return updatedReport;
  });
}

async function resolveReport({ adminId, reportId, adminNote }) {
  const existingReport = await prisma.playerReport.findUnique({
    where: { id: reportId },
    include: {
      match: true,
      reportedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!existingReport) {
    throw new AppError("Segnalazione non trovata", 404);
  }

  const cleanedAdminNote = cleanDescription(adminNote);

  if (!cleanedAdminNote) {
    throw new AppError(
      "Inserisci una nota admin per spiegare perché chiudi senza sospensione",
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.playerReport.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED",
        adminNote: cleanedAdminNote,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
      include: getReportInclude(),
    });

    const reportedName =
      existingReport.reportedUser.name || existingReport.reportedUser.email;

    await tx.notification.create({
      data: {
        userId: existingReport.reporterId,
        type: "REPORT_RESOLVED",
        title: "Segnalazione valutata",
        message: `La tua segnalazione su ${reportedName} per la partita "${existingReport.match.title}" è stata valutata. Decisione admin: ${cleanedAdminNote}`,
      },
    });

    return updatedReport;
  });
}

async function suspendUserFromReport({ adminId, reportId, days, adminNote }) {
  if (!VALID_SUSPENSION_DAYS.includes(days)) {
    throw new AppError(
      "Durata sospensione non valida. Usa 1, 3, 7, 30 oppure 365 giorni.",
      400
    );
  }

  const report = await prisma.playerReport.findUnique({
    where: { id: reportId },
    include: {
      reportedUser: true,
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      match: true,
    },
  });

  if (!report) {
    throw new AppError("Segnalazione non trovata", 404);
  }

  const newSuspendedUntil = getSuspensionUntil(days);
  const currentSuspendedUntil = report.reportedUser.suspendedUntil
    ? new Date(report.reportedUser.suspendedUntil)
    : null;

  const finalSuspendedUntil =
    currentSuspendedUntil && currentSuspendedUntil > newSuspendedUntil
      ? currentSuspendedUntil
      : newSuspendedUntil;

  const reasonLabel = REPORT_REASON_LABELS[report.reason] || report.reason;

  const cleanedAdminNote = cleanDescription(adminNote);

  const suspensionReason =
    cleanedAdminNote || `Sospensione per segnalazione: ${reasonLabel}`;

  const reportedName = report.reportedUser.name || report.reportedUser.email;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: report.reportedUserId },
      data: {
        suspendedUntil: finalSuspendedUntil,
        suspensionReason,
      },
      select: {
        id: true,
        name: true,
        email: true,
        suspendedUntil: true,
        suspensionReason: true,
      },
    });

    const updatedReport = await tx.playerReport.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED",
        adminNote: suspensionReason,
        suspensionDays: days,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
      include: getReportInclude(),
    });

    await tx.notification.create({
      data: {
        userId: report.reportedUserId,
        type: "ACCOUNT_SUSPENDED",
        title: "Account sospeso dalle partite",
        message: `Il tuo account è sospeso dalle partite fino al ${finalSuspendedUntil.toLocaleString(
          "it-IT"
        )}. Motivo: ${suspensionReason}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: report.reporterId,
        type: "REPORT_ACCEPTED",
        title: "Segnalazione accolta",
        message: `La tua segnalazione su ${reportedName} per la partita "${report.match.title}" è stata accolta. L’utente è stato sospeso dalle partite per ${days} giorni. Motivo admin: ${suspensionReason}`,
      },
    });

    return { user, report: updatedReport };
  });
}

async function getSuspendedUsers() {
  return prisma.user.findMany({
    where: {
      suspendedUntil: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      reliabilityScore: true,
      suspendedUntil: true,
      suspensionReason: true,
      createdAt: true,
    },
    orderBy: {
      suspendedUntil: "desc",
    },
  });
}

async function unsuspendUser({ adminId, userId, adminNote }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("Utente non trovato", 404);
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      suspendedUntil: null,
      suspensionReason: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "ACCOUNT_UNSUSPENDED",
      title: "Sospensione rimossa",
      message:
        cleanDescription(adminNote) ||
        "La sospensione del tuo account è stata rimossa. Puoi tornare a creare e partecipare alle partite.",
    },
  });

  return {
    user: updatedUser,
    removedByAdminId: adminId,
  };
}

module.exports = {
  getMatchManagement,
  createPlayerReport,
  getAdminReports,
  ignoreReport,
  resolveReport,
  suspendUserFromReport,
  getSuspendedUsers,
  unsuspendUser,
};
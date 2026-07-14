const { prisma } = require("../../shared/prisma");
const { AppError } = require("../../shared/errors");
const suspensionService = require("../../shared/suspension.service");

const VALID_APPEAL_STATUSES = ["OPEN", "APPROVED", "REJECTED"];

function cleanText(value) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getAppealInclude() {
  return {
    user: {
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
    playerReport: {
      include: {
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
          },
        },
      },
    },
  };
}

async function getLatestSuspensionReport(userId) {
  return prisma.playerReport.findFirst({
    where: {
      reportedUserId: userId,
      status: "RESOLVED",
      suspensionDays: {
        not: null,
      },
    },
    orderBy: {
      resolvedAt: "desc",
    },
  });
}

async function getMySuspensionAppealStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  });

  if (!user) {
    throw new AppError("Utente non trovato", 404);
  }

  const isSuspended = suspensionService.isSuspensionActive(user);

  const latestAppeal = await prisma.suspensionAppeal.findFirst({
    where: {
      userId,
    },
    include: getAppealInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });

  const openAppeal = await prisma.suspensionAppeal.findFirst({
    where: {
      userId,
      status: "OPEN",
    },
    include: getAppealInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    suspended: isSuspended,
    suspendedUntil: user.suspendedUntil,
    suspensionReason: user.suspensionReason,
    canRequestAppeal: isSuspended && !openAppeal,
    openAppeal,
    latestAppeal,
  };
}

async function createAppeal({ userId, message }) {
  const cleanedMessage = cleanText(message);

  if (!cleanedMessage) {
    throw new AppError(
      "Inserisci una motivazione per chiedere la revisione",
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  });

  if (!user) {
    throw new AppError("Utente non trovato", 404);
  }

  if (!suspensionService.isSuspensionActive(user)) {
    throw new AppError(
      "Puoi chiedere revisione solo se hai una sospensione attiva",
      400
    );
  }

  const existingOpenAppeal = await prisma.suspensionAppeal.findFirst({
    where: {
      userId,
      status: "OPEN",
    },
  });

  if (existingOpenAppeal) {
    throw new AppError(
      "Hai già una richiesta di revisione in attesa di valutazione",
      400
    );
  }

  const latestReport = await getLatestSuspensionReport(userId);

  return prisma.$transaction(async (tx) => {
    const appeal = await tx.suspensionAppeal.create({
      data: {
        userId,
        message: cleanedMessage,
        playerReportId: latestReport?.id || null,
        status: "OPEN",
      },
      include: getAppealInclude(),
    });

    const admins = await tx.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "SUSPENSION_APPEAL_CREATED",
          title: "Nuova richiesta di revisione",
          message: `${
            user.name || user.email
          } ha chiesto la revisione della sospensione.`,
        })),
      });
    }

    return appeal;
  });
}

async function getAdminAppeals({ status }) {
  const normalizedStatus = status ? String(status).trim().toUpperCase() : null;

  if (
    normalizedStatus &&
    !VALID_APPEAL_STATUSES.includes(normalizedStatus)
  ) {
    throw new AppError("Stato revisione non valido", 400);
  }

  return prisma.suspensionAppeal.findMany({
    where: normalizedStatus ? { status: normalizedStatus } : undefined,
    include: getAppealInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function rejectAppeal({ adminId, appealId, adminNote }) {
  const cleanedAdminNote = cleanText(adminNote);

  if (!cleanedAdminNote) {
    throw new AppError(
      "Inserisci una nota admin per spiegare perché respingi la revisione",
      400
    );
  }

  const appeal = await prisma.suspensionAppeal.findUnique({
    where: { id: appealId },
    include: {
      user: true,
    },
  });

  if (!appeal) {
    throw new AppError("Richiesta revisione non trovata", 404);
  }

  if (appeal.status !== "OPEN") {
    throw new AppError("Questa richiesta è già stata valutata", 400);
  }

  return prisma.$transaction(async (tx) => {
    const updatedAppeal = await tx.suspensionAppeal.update({
      where: { id: appealId },
      data: {
        status: "REJECTED",
        adminNote: cleanedAdminNote,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
      include: getAppealInclude(),
    });

    await tx.notification.create({
      data: {
        userId: appeal.userId,
        type: "SUSPENSION_APPEAL_REJECTED",
        title: "Revisione sospensione respinta",
        message: `La tua richiesta di revisione è stata respinta. Decisione admin: ${cleanedAdminNote}`,
      },
    });

    return updatedAppeal;
  });
}

async function approveAppeal({ adminId, appealId, adminNote }) {
  const cleanedAdminNote = cleanText(adminNote);

  if (!cleanedAdminNote) {
    throw new AppError(
      "Inserisci una nota admin per spiegare perché accogli la revisione",
      400
    );
  }

  const appeal = await prisma.suspensionAppeal.findUnique({
    where: { id: appealId },
    include: {
      user: true,
    },
  });

  if (!appeal) {
    throw new AppError("Richiesta revisione non trovata", 404);
  }

  if (appeal.status !== "OPEN") {
    throw new AppError("Questa richiesta è già stata valutata", 400);
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: appeal.userId },
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

    const updatedAppeal = await tx.suspensionAppeal.update({
      where: { id: appealId },
      data: {
        status: "APPROVED",
        adminNote: cleanedAdminNote,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
      include: getAppealInclude(),
    });

    await tx.notification.create({
      data: {
        userId: appeal.userId,
        type: "SUSPENSION_APPEAL_APPROVED",
        title: "Sospensione rimossa",
        message: `La tua richiesta di revisione è stata accolta. Puoi tornare a creare e partecipare alle partite. Decisione admin: ${cleanedAdminNote}`,
      },
    });

    return {
      user: updatedUser,
      appeal: updatedAppeal,
    };
  });
}

module.exports = {
  getMySuspensionAppealStatus,
  createAppeal,
  getAdminAppeals,
  rejectAppeal,
  approveAppeal,
};
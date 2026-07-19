const { prisma } = require("../../shared/prisma");

function getMatchInclude() {
  return {
    creator: {
      select: {
        id: true,
        name: true,
        email: true,
        reliabilityScore: true,
        preferredRole: true,
      },
    },
    field: {
      select: {
        id: true,
        name: true,
        sportType: true,
        size: true,
        surface: true,
        indoor: true,
        pricePerHour: true,
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
    guests: {
      select: {
        id: true,
        name: true,
        preferredRole: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
    bookings: {
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        userId: true,
        matchId: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
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
      orderBy: {
        createdAt: "asc",
      },
    },
  };
}

async function findAllMatches() {
  return prisma.match.findMany({
    orderBy: {
      startsAt: "asc",
    },
    include: getMatchInclude(),
  });
}

async function findMatchById(id) {
  return prisma.match.findUnique({
    where: {
      id,
    },
    include: getMatchInclude(),
  });
}

async function createMatch(data) {
  // 1. Estraiamo i guests dal resto dei dati
  const { guests, ...matchData } = data;

  return prisma.match.create({
    data: {
      ...matchData,
      // 2. Forza l'inserimento di depositAmount (default a 0 se manca)
      depositAmount: matchData.depositAmount || 0,
      
      // 3. Prisma vuole la sintassi { create: [...] } per le relazioni
      guests: guests && guests.length > 0 ? { create: guests } : undefined,
    },
    include: getMatchInclude(),
  });
}

async function updateMatchStatus(id, status) {
  return prisma.match.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: getMatchInclude(),
  });
}

module.exports = {
  findAllMatches,
  findMatchById,
  createMatch,
  updateMatchStatus,
};
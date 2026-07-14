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
            distanceKm: true,
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
  return prisma.match.create({
    data,
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
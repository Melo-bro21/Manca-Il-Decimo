const { prisma } = require("../../shared/prisma");

async function findBookingByUserAndMatch(userId, matchId) {
  return prisma.booking.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId,
      },
    },
  });
}

async function findBookingById(id) {
  return prisma.booking.findUnique({
    where: {
      id,
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
}

async function findBookingsByMatchId(matchId) {
  return prisma.booking.findMany({
    where: {
      matchId,
      status: "ACTIVE",
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
        select: {
          id: true,
          title: true,
          creatorId: true,
          startsAt: true,
          pricePerPlayer: true,
          depositAmount: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function findBookingsByUserId(userId) {
  return prisma.booking.findMany({
    where: {
      userId,
      status: {
        in: ["ACTIVE", "CANCELLED", "LATE_CANCELLED"],
      },
    },
    include: {
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
    orderBy: {
      createdAt: "desc",
    },
  });
}

module.exports = {
  findBookingByUserAndMatch,
  findBookingById,
  findBookingsByMatchId,
  findBookingsByUserId,
};
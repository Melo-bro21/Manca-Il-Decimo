const { prisma } = require("../../shared/prisma");

function findMatchById(matchId) {
  return prisma.match.findUnique({
    where: {
      id: matchId,
    },
  });
}

function findBookingByUserAndMatch(userId, matchId) {
  return prisma.booking.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId,
      },
    },
  });
}

function findWaitlistEntryByUserAndMatch(userId, matchId) {
  return prisma.waitlistEntry.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId,
      },
    },
  });
}

function countWaitlistEntriesByMatchId(matchId) {
  return prisma.waitlistEntry.count({
    where: {
      matchId,
      status: "WAITING",
    },
  });
}

function createWaitlistEntry(data) {
  return prisma.waitlistEntry.create({
    data,
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
}

function findWaitlistEntriesByMatchId(matchId) {
  return prisma.waitlistEntry.findMany({
    where: {
      matchId,
    },
    orderBy: {
      position: "asc",
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
    },
  });
}

function findWaitlistEntriesByUserId(userId) {
  return prisma.waitlistEntry.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      match: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          status: true,
          depositAmount: true,
          pricePerPlayer: true,
          maxPlayers: true,
          currentPlayers: true,
          field: {
            select: {
              id: true,
              name: true,
              sportType: true,
              size: true,
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

function findWaitlistEntryById(waitlistEntryId) {
  return prisma.waitlistEntry.findUnique({
    where: {
      id: waitlistEntryId,
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
}

function findFirstWaitingEntryByMatchId(matchId) {
  return prisma.waitlistEntry.findFirst({
    where: {
      matchId,
      status: "WAITING",
    },
    orderBy: {
      position: "asc",
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
          creatorId: true,
        },
      },
    },
  });
}

module.exports = {
  findMatchById,
  findBookingByUserAndMatch,
  findWaitlistEntryByUserAndMatch,
  countWaitlistEntriesByMatchId,
  createWaitlistEntry,
  findWaitlistEntriesByMatchId,
  findWaitlistEntriesByUserId,
  findWaitlistEntryById,
  findFirstWaitingEntryByMatchId,
};
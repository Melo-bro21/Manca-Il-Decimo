const { prisma } = require("../../shared/prisma");

function getJoinRequestInclude() {
  return {
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
  };
}

async function findRequestByUserAndMatch(userId, matchId) {
  return prisma.matchJoinRequest.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId,
      },
    },
    include: getJoinRequestInclude(),
  });
}

async function createJoinRequest({ userId, matchId }) {
  return prisma.matchJoinRequest.create({
    data: {
      userId,
      matchId,
      status: "PENDING",
    },
    include: getJoinRequestInclude(),
  });
}

async function findRequestsByMatchId(matchId) {
  return prisma.matchJoinRequest.findMany({
    where: {
      matchId,
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
          requiresApproval: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function findRequestById(id) {
  return prisma.matchJoinRequest.findUnique({
    where: {
      id,
    },
    include: getJoinRequestInclude(),
  });
}

async function updateRequestStatus(id, status) {
  return prisma.matchJoinRequest.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: getJoinRequestInclude(),
  });
}

module.exports = {
  findRequestByUserAndMatch,
  createJoinRequest,
  findRequestsByMatchId,
  findRequestById,
  updateRequestStatus,
};
const { prisma } = require("../../shared/prisma");

async function findAllSportsCenters() {
  return prisma.sportsCenter.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      fields: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          sportType: true,
          size: true,
          surface: true,
          indoor: true,
          pricePerHour: true,
        },
      },
    },
  });
}

async function findSportsCenterById(id) {
  return prisma.sportsCenter.findUnique({
    where: {
      id,
    },
    include: {
      fields: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          sportType: true,
          size: true,
          surface: true,
          indoor: true,
          pricePerHour: true,
        },
      },
    },
  });
}

async function findFieldsBySportsCenterId(sportsCenterId) {
  return prisma.field.findMany({
    where: {
      sportsCenterId,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      sportType: true,
      size: true,
      surface: true,
      indoor: true,
      pricePerHour: true,
      sportsCenterId: true,
    },
  });
}

module.exports = {
  findAllSportsCenters,
  findSportsCenterById,
  findFieldsBySportsCenterId,
};
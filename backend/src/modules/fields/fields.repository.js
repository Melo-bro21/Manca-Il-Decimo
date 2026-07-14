const { prisma } = require("../../shared/prisma");

async function findAllFields() {
  return prisma.field.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
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
  });
}

async function findFieldById(id) {
  return prisma.field.findUnique({
    where: {
      id,
    },
    include: {
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
    include: {
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
  });
}

async function findActiveMatchesByFieldIds(fieldIds) {
  return prisma.match.findMany({
    where: {
      fieldId: {
        in: fieldIds,
      },
      status: {
        notIn: ["CANCELLED", "COMPLETED"],
      },
    },
    select: {
      id: true,
      fieldId: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
    },
  });
}

module.exports = {
  findAllFields,
  findFieldById,
  findFieldsBySportsCenterId,
  findActiveMatchesByFieldIds,
};
const { prisma } = require("../../shared/prisma");

async function findNotificationsByUserId(userId) {
  return prisma.notification.findMany({
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
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      },
      penalty: {
        select: {
          id: true,
          type: true,
          points: true,
          reason: true,
        },
      },
      waitlistEntry: {
        select: {
          id: true,
          status: true,
          position: true,
        },
      },
    },
  });
}

async function countUnreadNotificationsByUserId(userId) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

async function findNotificationById(id) {
  return prisma.notification.findUnique({
    where: {
      id,
    },
  });
}

async function markNotificationAsRead(id) {
  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      read: true,
    },
  });
}

async function markAllNotificationsAsRead(userId) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}

async function createNotification(data) {
  return prisma.notification.create({
    data,
  });
}

async function createManyNotifications(data) {
  return prisma.notification.createMany({
    data,
  });
}

module.exports = {
  findNotificationsByUserId,
  countUnreadNotificationsByUserId,
  findNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  createManyNotifications,
};
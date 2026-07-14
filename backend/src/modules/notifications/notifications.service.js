const { AppError } = require("../../shared/errors");
const notificationsRepository = require("./notifications.repository");

const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  MATCH_NEW_BOOKING: "MATCH_NEW_BOOKING",
  MATCH_FULL: "MATCH_FULL",

  WAITLIST_JOINED: "WAITLIST_JOINED",
  MATCH_NEW_WAITLIST_ENTRY: "MATCH_NEW_WAITLIST_ENTRY",

  PENALTY_RECEIVED: "PENALTY_RECEIVED",
  MATCH_CANCELLED: "MATCH_CANCELLED",

  JOIN_REQUEST_RECEIVED: "JOIN_REQUEST_RECEIVED",
  JOIN_REQUEST_APPROVED: "JOIN_REQUEST_APPROVED",
  JOIN_REQUEST_REJECTED: "JOIN_REQUEST_REJECTED",

  LATE_CANCELLATION_CREATED: "LATE_CANCELLATION_CREATED",
};

async function getMyNotifications(userId) {
  return notificationsRepository.findNotificationsByUserId(userId);
}

async function getMyUnreadCount(userId) {
  const count = await notificationsRepository.countUnreadNotificationsByUserId(
    userId
  );

  return {
    unreadCount: count,
  };
}

async function markAsRead({ userId, notificationId }) {
  const notification = await notificationsRepository.findNotificationById(
    notificationId
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (notification.userId !== userId) {
    throw new AppError("You cannot read another user's notification", 403);
  }

  return notificationsRepository.markNotificationAsRead(notificationId);
}

async function markAllAsRead(userId) {
  const result = await notificationsRepository.markAllNotificationsAsRead(userId);

  return {
    updatedCount: result.count,
  };
}

async function createNotification(data) {
  if (!Object.values(NOTIFICATION_TYPES).includes(data.type)) {
    throw new AppError("Invalid notification type", 400);
  }

  return notificationsRepository.createNotification(data);
}

async function createManyNotifications(data) {
  if (!data.length) {
    return {
      count: 0,
    };
  }

  const hasInvalidType = data.some((notification) => {
    return !Object.values(NOTIFICATION_TYPES).includes(notification.type);
  });

  if (hasInvalidType) {
    throw new AppError("Invalid notification type", 400);
  }

  return notificationsRepository.createManyNotifications(data);
}

module.exports = {
  NOTIFICATION_TYPES,
  getMyNotifications,
  getMyUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  createManyNotifications,
};
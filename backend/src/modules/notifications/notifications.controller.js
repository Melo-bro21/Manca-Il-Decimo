const notificationsService = require("./notifications.service");

async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    const notifications = await notificationsService.getMyNotifications(userId);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await notificationsService.getMyUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = Number(req.params.id);

    const notification = await notificationsService.markAsRead({
      userId,
      notificationId,
    });

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await notificationsService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  getMyUnreadCount,
  markAsRead,
  markAllAsRead,
};
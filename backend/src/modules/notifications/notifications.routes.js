const express = require("express");

const notificationsController = require("./notifications.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { notificationIdParamSchema } = require("./notifications.validation");

const router = express.Router();

router.get(
  "/me",
  authMiddleware,
  notificationsController.getMyNotifications
);

router.get(
  "/unread-count",
  authMiddleware,
  notificationsController.getMyUnreadCount
);

router.patch(
  "/read-all",
  authMiddleware,
  notificationsController.markAllAsRead
);

router.patch(
  "/:id/read",
  authMiddleware,
  validate(notificationIdParamSchema),
  notificationsController.markAsRead
);

module.exports = router;
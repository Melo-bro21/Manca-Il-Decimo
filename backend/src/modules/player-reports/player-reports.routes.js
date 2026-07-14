const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const playerReportsController = require("./player-reports.controller");

const router = express.Router();

router.get(
  "/matches/:id/manage",
  authMiddleware,
  playerReportsController.getMatchManagement
);

router.post(
  "/matches/:id/reports",
  authMiddleware,
  playerReportsController.createPlayerReport
);

router.get(
  "/admin/reports",
  authMiddleware,
  adminMiddleware,
  playerReportsController.getAdminReports
);

router.patch(
  "/admin/reports/:id/ignore",
  authMiddleware,
  adminMiddleware,
  playerReportsController.ignoreReport
);

router.patch(
  "/admin/reports/:id/resolve",
  authMiddleware,
  adminMiddleware,
  playerReportsController.resolveReport
);

router.patch(
  "/admin/reports/:id/suspend",
  authMiddleware,
  adminMiddleware,
  playerReportsController.suspendUserFromReport
);

router.get(
  "/admin/suspended-users",
  authMiddleware,
  adminMiddleware,
  playerReportsController.getSuspendedUsers
);

router.patch(
  "/admin/users/:id/unsuspend",
  authMiddleware,
  adminMiddleware,
  playerReportsController.unsuspendUser
);

module.exports = router;
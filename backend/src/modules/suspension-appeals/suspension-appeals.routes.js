const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const suspensionAppealsController = require("./suspension-appeals.controller");

const router = express.Router();

router.get(
  "/users/me/suspension-appeal-status",
  authMiddleware,
  suspensionAppealsController.getMySuspensionAppealStatus
);

router.post(
  "/suspension-appeals",
  authMiddleware,
  suspensionAppealsController.createAppeal
);

router.get(
  "/admin/suspension-appeals",
  authMiddleware,
  adminMiddleware,
  suspensionAppealsController.getAdminAppeals
);

router.patch(
  "/admin/suspension-appeals/:id/reject",
  authMiddleware,
  adminMiddleware,
  suspensionAppealsController.rejectAppeal
);

router.patch(
  "/admin/suspension-appeals/:id/approve",
  authMiddleware,
  adminMiddleware,
  suspensionAppealsController.approveAppeal
);

module.exports = router;
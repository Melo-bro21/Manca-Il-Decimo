const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");

const waitlistController = require("./waitlist.controller");
const {
  matchIdParamSchema,
  confirmWaitlistPresenceSchema,
} = require("./waitlist.validation");

const router = express.Router();

router.post(
  "/matches/:id/waitlist",
  authMiddleware,
  validate(matchIdParamSchema),
  waitlistController.joinWaitlist
);

router.get(
  "/matches/:id/waitlist",
  validate(matchIdParamSchema),
  waitlistController.getMatchWaitlist
);

router.get(
  "/users/me/waitlist",
  authMiddleware,
  waitlistController.getMyWaitlist
);

router.patch(
  "/waitlist/:id/confirm",
  authMiddleware,
  validate(confirmWaitlistPresenceSchema),
  waitlistController.confirmPresence
);

router.patch(
  "/waitlist/:id/decline",
  authMiddleware,
  waitlistController.declineReservedSpot
);

module.exports = router;
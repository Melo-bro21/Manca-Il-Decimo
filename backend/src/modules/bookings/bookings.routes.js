const express = require("express");

const bookingsController = require("./bookings.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const {
  joinMatchSchema,
  bookingIdParamSchema,
} = require("./bookings.validation");

const router = express.Router();

router.get(
  "/matches/:id/join-summary",
  authMiddleware,
  validate(joinMatchSchema),
  bookingsController.getJoinSummary
);

router.post(
  "/matches/:id/bookings",
  authMiddleware,
  validate(joinMatchSchema),
  bookingsController.joinMatch
);


router.get(
  "/matches/:id/bookings",
  bookingsController.getMatchBookings
);

router.get(
  "/users/me/bookings",
  authMiddleware,
  bookingsController.getMyBookings
);

router.patch(
  "/bookings/:id/pay-wallet",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.payBookingWithWallet
);

router.patch(
  "/bookings/:id/pay-on-site",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.chooseOnSitePayment
);


router.patch(
  "/bookings/:id/confirm-attendance",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.confirmAttendance
);

router.patch(
  "/bookings/:id/no-show",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.markNoShow
);

router.patch(
  "/bookings/:id/leave",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.leaveBooking
);

router.patch(
  "/bookings/:id/late-cancel",
  authMiddleware,
  validate(bookingIdParamSchema),
  bookingsController.requestLateCancellation
);

router.delete(
  "/matches/:matchId/guests/:guestId",
  authMiddleware,
  bookingsController.removeGuestFromMatch
);

module.exports = router;
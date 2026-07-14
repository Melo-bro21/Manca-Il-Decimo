const bookingsService = require("./bookings.service");

async function joinMatch(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const booking = await bookingsService.joinMatch({
      userId,
      matchId,
    });

    return res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function getMatchBookings(req, res, next) {
  try {
    const matchId = Number(req.params.id);

    const bookings = await bookingsService.getMatchBookings(matchId);

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const userId = req.user.id;

    const bookings = await bookingsService.getMyBookings(userId);

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

async function payBookingWithWallet(req, res, next) {
  try {
    const userId = req.user.id;
    const bookingId = Number(req.params.id);

    const booking = await bookingsService.payBookingWithWallet({
      userId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function chooseOnSitePayment(req, res, next) {
  try {
    const userId = req.user.id;
    const bookingId = Number(req.params.id);

    const booking = await bookingsService.chooseOnSitePayment({
      userId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function confirmAttendance(req, res, next) {
  try {
    const organizerId = req.user.id;
    const bookingId = Number(req.params.id);

    const booking = await bookingsService.confirmAttendance({
      organizerId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function markNoShow(req, res, next) {
  try {
    const organizerId = req.user.id;
    const bookingId = Number(req.params.id);

    const booking = await bookingsService.markNoShow({
      organizerId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

async function leaveBooking(req, res, next) {
  try {
    const userId = req.user.id;
    const bookingId = Number(req.params.id);

    const result = await bookingsService.leaveBooking({
      userId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      message: "Sei uscito dalla partita",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function requestLateCancellation(req, res, next) {
  try {
    const userId = req.user.id;
    const bookingId = Number(req.params.id);
    const { reason } = req.body;

    const result = await bookingsService.requestLateCancellation({
      userId,
      bookingId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Uscita di emergenza registrata",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function removeGuestFromMatch(req, res, next) {
  try {
    const organizerId = req.user.id;
    const matchId = Number(req.params.matchId);
    const guestId = Number(req.params.guestId);

    const result = await bookingsService.removeGuestFromMatch({
      organizerId,
      matchId,
      guestId,
    });

    return res.status(200).json({
      success: true,
      message: "Giocatore rimosso dalla partita",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getJoinSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const summary = await bookingsService.getJoinSummary({
      userId,
      matchId,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJoinSummary,
  joinMatch,
  getMatchBookings,
  getMyBookings,
  payBookingWithWallet,
  chooseOnSitePayment,
  confirmAttendance,
  markNoShow,
  leaveBooking,
  requestLateCancellation,
  removeGuestFromMatch,
};
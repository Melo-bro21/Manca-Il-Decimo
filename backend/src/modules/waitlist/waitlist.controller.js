const waitlistService = require("./waitlist.service");
const { AppError } = require("../../shared/errors");

async function joinWaitlist(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const waitlistEntry = await waitlistService.joinWaitlist({
      userId,
      matchId,
    });

    return res.status(201).json({
      success: true,
      data: waitlistEntry,
    });
  } catch (error) {
    next(error);
  }
}

async function getMatchWaitlist(req, res, next) {
  try {
    const matchId = Number(req.params.id);

    const waitlist = await waitlistService.getMatchWaitlist(matchId);

    return res.status(200).json({
      success: true,
      data: waitlist,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyWaitlist(req, res, next) {
  try {
    const userId = req.user.id;

    const waitlist = await waitlistService.getMyWaitlist(userId);

    return res.status(200).json({
      success: true,
      data: waitlist,
    });
  } catch (error) {
    next(error);
  }
}

async function confirmPresence(req, res, next) {
  try {
    const userId = req.user.id;
    const waitlistEntryId = Number(req.params.id);
    const { paymentMethod } = req.body;

    const result = await waitlistService.confirmPresence({
      userId,
      waitlistEntryId,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      message: "Presenza confermata",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function declineReservedSpot(req, res, next) {
  try {
    const userId = req.user.id;
    const waitlistEntryId = Number(req.params.id);

    if (!Number.isInteger(waitlistEntryId) || waitlistEntryId <= 0) {
      throw new AppError("Waitlist entry non valida", 400);
    }

    const result = await waitlistService.declineReservedSpot({
      userId,
      waitlistEntryId,
    });

    return res.status(200).json({
      success: true,
      message: "Posto riservato rifiutato",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  joinWaitlist,
  getMatchWaitlist,
  getMyWaitlist,
  confirmPresence,
  declineReservedSpot,
};
const joinRequestsService = require("./join-requests.service");

async function requestToJoinMatch(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const joinRequest = await joinRequestsService.requestToJoinMatch({
      userId,
      matchId,
    });

    return res.status(201).json({
      success: true,
      data: joinRequest,
    });
  } catch (error) {
    next(error);
  }
}

async function getMatchJoinRequests(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const requests = await joinRequestsService.getMatchJoinRequests({
      userId,
      matchId,
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
}

async function approveJoinRequest(req, res, next) {
  try {
    const userId = req.user.id;
    const requestId = Number(req.params.id);

    const result = await joinRequestsService.approveJoinRequest({
      userId,
      requestId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function rejectJoinRequest(req, res, next) {
  try {
    const userId = req.user.id;
    const requestId = Number(req.params.id);

    const joinRequest = await joinRequestsService.rejectJoinRequest({
      userId,
      requestId,
    });

    return res.status(200).json({
      success: true,
      data: joinRequest,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestToJoinMatch,
  getMatchJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};
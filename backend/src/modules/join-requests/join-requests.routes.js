const express = require("express");

const joinRequestsController = require("./join-requests.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post(
  "/matches/:id/join-requests",
  authMiddleware,
  joinRequestsController.requestToJoinMatch
);

router.get(
  "/matches/:id/join-requests",
  authMiddleware,
  joinRequestsController.getMatchJoinRequests
);

router.patch(
  "/join-requests/:id/approve",
  authMiddleware,
  joinRequestsController.approveJoinRequest
);

router.patch(
  "/join-requests/:id/reject",
  authMiddleware,
  joinRequestsController.rejectJoinRequest
);

module.exports = router;
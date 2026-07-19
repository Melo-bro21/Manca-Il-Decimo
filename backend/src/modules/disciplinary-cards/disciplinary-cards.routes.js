const express = require("express");

const disciplinaryCardsController = require(
  "./disciplinary-cards.controller"
);

const authMiddleware = require(
  "../../middlewares/auth.middleware"
);

const router = express.Router();

router.get(
  "/me",
  authMiddleware,
  disciplinaryCardsController.getMyDisciplinaryState
);

module.exports = router;
const express = require("express");

const matchesController = require("./matches.controller");
const  authMiddleware  = require("../../middlewares/auth.middleware");
const  validate  = require("../../middlewares/validate.middleware");
const { createMatchSchema } = require("./matches.validation");

const router = express.Router();

router.get("/", matchesController.getMatches);

router.post(
  "/",
  authMiddleware,
  validate(createMatchSchema),
  matchesController.createMatch
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  matchesController.cancelMatch
);

router.get("/:id", matchesController.getMatchById);

module.exports = router;
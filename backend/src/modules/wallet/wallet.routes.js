const express = require("express");

const walletController = require("./wallet.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { topUpSchema } = require("./wallet.validation");

const router = express.Router();

router.get(
  "/me",
  authMiddleware,
  walletController.getMyWallet
);

router.post(
  "/top-up",
  authMiddleware,
  validate(topUpSchema),
  walletController.topUpWallet
);

router.get(
  "/transactions",
  authMiddleware,
  walletController.getMyTransactions
);

module.exports = router;
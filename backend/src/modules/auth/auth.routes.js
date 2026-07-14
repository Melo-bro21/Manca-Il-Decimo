const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authController = require("./auth.controller");
const validate = require("../../middlewares/validate.middleware");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./auth.validation");

const router = express.Router();

router.post(
  "/register",
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  validate(loginSchema),
  authController.login
);

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.get(
  "/me",
  authMiddleware,
  authController.me
);

module.exports = router;
const express = require('express');

const usersController = require('./users.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  updateMeSchema,
  changePasswordSchema,
} = require('./users.validation');

const router = express.Router();

router.get(
  '/me',
  authMiddleware,
  usersController.getMe
);

router.patch(
  '/me',
  authMiddleware,
  validate(updateMeSchema),
  usersController.updateMe
);

router.patch(
  '/me/password',
  authMiddleware,
  validate(changePasswordSchema),
  usersController.changePassword
);

router.post(
  '/me/premium/activate',
  authMiddleware,
  usersController.activatePremium
);
module.exports = router;
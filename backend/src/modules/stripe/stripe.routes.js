const express = require('express');
const stripeController = require('./stripe.webhook.controller');

const router = express.Router();

// ATTENZIONE: Qui usiamo express.raw per mantenere intatto il corpo della richiesta
router.post(
  '/webhook', 
  express.raw({ type: 'application/json' }), 
  stripeController.handleStripeWebhook
);

module.exports = router;
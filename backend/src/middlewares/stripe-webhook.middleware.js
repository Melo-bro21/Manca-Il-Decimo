const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  try {
    // Verifica la firma segreta che trovi nella dashboard di Stripe
    req.event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
    next();
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = verifyStripeWebhook;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bookingsService = require('../bookings/bookings.service'); // Importiamo il servizio che aggiornerà il DB

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verifica che la richiesta arrivi DAVVERO da Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gestiamo l'evento di successo
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;

    console.log(`Pagamento riuscito per booking: ${bookingId}`);
    
    // Aggiorna il database! (Dobbiamo creare questa funzione nel service)
    await bookingsService.markBookingAsPaid(bookingId);
  }

  res.json({ received: true });
}

module.exports = { handleStripeWebhook };
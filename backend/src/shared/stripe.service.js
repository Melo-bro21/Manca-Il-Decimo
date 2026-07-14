// backend/src/shared/stripe.service.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Crea un PaymentIntent: è l'oggetto che dice a Stripe:
 * "Ehi, mi aspetto un pagamento di X euro per questa specifica prenotazione".
 */
async function createPaymentIntent(amountInCents, bookingId) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents, // Stripe vuole l'importo in centesimi (es. 10€ = 1000)
      currency: 'eur',
      metadata: {
        bookingId: bookingId, // Fondamentale per ritrovare la prenotazione dopo il pagamento
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Errore Stripe:", error);
    throw new Error("Impossibile creare il pagamento con Stripe");
  }
}

module.exports = {
  createPaymentIntent,
};
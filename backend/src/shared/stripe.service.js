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
/**
 * Gestisce i pagamenti (PaymentIntent)
 */
async function createPaymentIntent(amountInCents, bookingId) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      metadata: {
        bookingId: bookingId,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error("Errore Stripe PaymentIntent:", error);
    throw new Error("Impossibile creare il pagamento con Stripe");
  }
}

/**
 * Gestisce l'onboarding dei Centri Sportivi (Stripe Connect)
 */
async function createOnboardingLink(email, returnUrl) {
  try {
    // 1. Crea l'account Stripe per il centro (il "Connected Account")
    const account = await stripe.accounts.create({
      type: 'standard', // 'standard' è il più semplice per iniziare
      email: email,
    });

    // 2. Crea il link sicuro dove il proprietario metterà i suoi dati bancari
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}/refresh`, // Dove mandarlo se qualcosa fallisce
      return_url: `${returnUrl}/success`,  // Dove mandarlo a configurazione finita
      type: 'account_onboarding',
    });

    return { accountId: account.id, url: accountLink.url };
  } catch (error) {
    console.error("Errore Stripe Onboarding:", error);
    throw new Error("Impossibile creare il link di onboarding");
  }
}

module.exports = {
  createPaymentIntent,
  createOnboardingLink,
};

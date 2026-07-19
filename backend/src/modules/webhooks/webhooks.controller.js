const prisma = require('../../shared/prisma').prisma;

async function handleStripeWebhook(req, res) {
  const event = req.event;

  if (event.type === 'account.updated') {
    const account = event.data.object;

    // Se Stripe dice che i requisiti sono soddisfatti (charges_enabled è true)
    if (account.charges_enabled) {
      await prisma.sportsCenter.updateMany({
        where: { stripeAccountId: account.id },
        data: { isOnboarded: true }
      });
      console.log(`Centro sportivo ${account.id} attivato!`);
    }
  }

  res.json({ received: true });
}

module.exports = { handleStripeWebhook };
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require("./config/env");

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const sportsCenterRoutes = require('./modules/sports-centers/sports-centers.routes');
const fieldsRoutes = require('./modules/fields/fields.routes');
const matchesRoutes = require("./modules/matches/matches.routes");
const bookingsRoutes = require("./modules/bookings/bookings.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const waitlistRoutes = require("./modules/waitlist/waitlist.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const joinRequestsRoutes = require("./modules/join-requests/join-requests.routes");
const playerReportsRoutes = require("./modules/player-reports/player-reports.routes");
const suspensionAppealsRoutes = require("./modules/suspension-appeals/suspension-appeals.routes");
const disciplinaryCardsRoutes = require(
  "./modules/disciplinary-cards/disciplinary-cards.routes"
);

// CORREZIONE 1: Importa correttamente senza ripetere "src/"
const webhookController = require('./modules/webhooks/webhooks.controller');
const verifyStripeWebhook = require('./middlewares/stripe-webhook.middleware'); 

const notFoundMiddleware = require("./middlewares/not-found.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

// CORREZIONE 2: Usa express.raw E INSERISCI il middleware verifyStripeWebhook
app.post(
  '/api/webhooks', 
  express.raw({type: 'application/json'}), 
  verifyStripeWebhook, // <--- ADESSO è inserito correttamente!
  webhookController.handleStripeWebhook
);

app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 

if(env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// ... il resto del codice rimane invariato
app.get("/", (req,res) => {
 res.json({ success: true, message: "Manca il Decimo backend is running" });
});

// ... (tutte le altre tue app.use delle rotte)
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/sports-centers', sportsCenterRoutes);
app.use('/fields', fieldsRoutes);
app.use("/matches", matchesRoutes);
app.use("/", bookingsRoutes);
app.use("/wallet", walletRoutes);
app.use("/", waitlistRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/", joinRequestsRoutes);
app.use("/", playerReportsRoutes);
app.use("/", suspensionAppealsRoutes);
app.use("/disciplinary-cards", disciplinaryCardsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app; 
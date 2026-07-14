const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require("./config/env");

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const sportsCenterRoutes= require('./modules/sports-centers/sports-centers.routes');
const fieldsRoutes = require('./modules/fields/fields.routes');
const matchesRoutes = require("./modules/matches/matches.routes");
const bookingsRoutes = require("./modules/bookings/bookings.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const waitlistRoutes = require("./modules/waitlist/waitlist.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const joinRequestsRoutes = require("./modules/join-requests/join-requests.routes");
const playerReportsRoutes = require("./modules/player-reports/player-reports.routes");
const suspensionAppealsRoutes = require("./modules/suspension-appeals/suspension-appeals.routes");

const notFoundMiddleware=require("./middlewares/not-found.middleware");
const errorMiddleware=require("./middlewares/error.middleware");


const app=express(); 

app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 

if(env.nodeEnv === "development")
{
 app.use(morgan("dev"));
}

app.get("/", (req,res) =>
{
 res.json({
    success: true,
    message: "Manca il Decimo backend is running", 
 });
});

app.get("/health", (req,res)=>
{
 res.json({
   success: true,
   status: "ok",
   uptime: process.uptime(), 
   timestamp: new Date().toISOString(), 
 });
})

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/sports-centers',sportsCenterRoutes);
app.use('/fields', fieldsRoutes);
app.use("/matches", matchesRoutes);
app.use("/", bookingsRoutes);
app.use("/wallet", walletRoutes);
app.use("/", waitlistRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/", joinRequestsRoutes);
app.use("/", playerReportsRoutes);
app.use("/", suspensionAppealsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports=app;
const express = require('express');
const sportsCenterController= require('./sports-centers.controller');
const authMiddleware = require('../../middlewares/auth.middleware'); // Assicurati sia il path corretto
const centerOwnerMiddleware = require('../../middlewares/centerOwner.middleware');
const router = express.Router();

// Rotta per creare un nuovo centro (Protetta: solo CENTER_OWNER)
router.post("/", authMiddleware, centerOwnerMiddleware, sportsCenterController.createSportsCenter);
    
// NUOVA ROTTA: Onboarding Stripe (Protetta: solo CENTER_OWNER)
router.post("/onboard", authMiddleware, centerOwnerMiddleware, sportsCenterController.onboardSportsCenter);

router.get("/", sportsCenterController.getAllSportsCenter);
router.get("/:id/fields", sportsCenterController.getFieldsBySportsCenterId);
router.get("/:id",sportsCenterController.getSportsCenterById);

module.exports=router;
const express = require('express');
const sportsCenterController= require('./sports-centers.controller');

const router = express.Router();

router.get("/", sportsCenterController.getAllSportsCenter);
router.get("/:id/fields", sportsCenterController.getFieldsBySportsCenterId);
router.get("/:id",sportsCenterController.getSportsCenterById);

module.exports=router;
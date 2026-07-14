const express = require("express");
const fieldsController = require("./fields.controller");

const router = express.Router();

router.get("/", fieldsController.getAllFields);

router.get("/availability", fieldsController.getFieldsAvailability);

router.get("/:id", fieldsController.getFieldById);

module.exports = router;
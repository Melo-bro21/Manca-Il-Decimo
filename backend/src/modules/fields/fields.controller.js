const fieldService = require("./fields.service");

async function getAllFields(req, res, next) {
  try {
    const fields = await fieldService.getAllFields();
    res.status(200).json({ message: "Success", data: fields });
  } catch (error) { next(error); }
}

async function getFieldById(req, res, next) {
  try {
    const field = await fieldService.getFieldById(Number(req.params.id));
    res.status(200).json({ message: "Success", data: field });
  } catch (error) { next(error); }
}

async function getFieldsAvailability(req, res, next) {
  try {
    const { sportsCenterId, startsAt, durationMinutes } = req.query;
    
    // Log per vedere cosa arriva dal frontend
    console.log("DEBUG BACKEND: Ricevuta query:", req.query);

    const fields = await fieldService.getFieldsAvailability({
      sportsCenterId: Number(sportsCenterId),
      startsAt,
      durationMinutes: Number(durationMinutes)
    });
    
    res.status(200).json({ message: "Success", data: fields });
  } catch (error) {
    // IMPORTANTE: Questo stampa l'errore reale nel terminale invece di nasconderlo
    console.error("DEBUG BACKEND ERRORE:", error); 
    next(error); 
  }
}

// ATTENZIONE: i nomi qui devono corrispondere ESATTAMENTE a quelli sopra
module.exports = {
  getAllFields: getAllFields,
  getFieldById: getFieldById,
  getFieldsAvailability: getFieldsAvailability
};
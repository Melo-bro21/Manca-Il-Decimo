const fieldsRepository = require("./fields.repository");
const { AppError } = require("../../shared/errors");

function getMatchEndDate(startsAt, durationMinutes) {
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

function hasTimeOverlap(existingMatch, newStart, newEnd) {
  const existingStart = new Date(existingMatch.startsAt);
  const existingEnd = getMatchEndDate(
    existingStart,
    existingMatch.durationMinutes
  );

  return existingStart < newEnd && existingEnd > newStart;
}

async function getAllFields() {
  return fieldsRepository.findAllFields();
}

async function getFieldById(id) {
  const field = await fieldsRepository.findFieldById(id);

  if (!field) {
    throw new AppError("Field not found", 404);
  }

  return field;
}

async function getFieldsAvailability({ sportsCenterId, startsAt, durationMinutes }) {
  // --- FIX: Convertiamo esplicitamente in numero ---
  const id = parseInt(sportsCenterId, 10);

  if (!id || Number.isNaN(id)) {
    throw new AppError("Sports center id non valido", 400);
  }

  // ... (controlli restanti invariati)

  const newStart = new Date(startsAt);
  if (Number.isNaN(newStart.getTime())) {
    throw new AppError("Data non valida", 400);
  }

  const newEnd = getMatchEndDate(newStart, durationMinutes);

  // --- FIX: Usiamo l'ID convertito ---
  const fields = await fieldsRepository.findFieldsBySportsCenterId(id);

  if (fields.length === 0) {
    return [];
  }

  const fieldIds = fields.map((field) => field.id);
  
  // Assicurati che fieldIds sia un array valido
  const activeMatches = await fieldsRepository.findActiveMatchesByFieldIds(fieldIds);

  return fields.map((field) => {
    const conflictingMatch = activeMatches.find((match) => {
      // Importante: assicurati che match.fieldId e field.id siano confrontabili
      return Number(match.fieldId) === Number(field.id) && hasTimeOverlap(match, newStart, newEnd);
    });

    return {
      ...field,
      isAvailable: !conflictingMatch,
      unavailableReason: conflictingMatch ? "Campo occupato" : null,
    };
  });
}

module.exports = {
  getAllFields,
  getFieldById,
  getFieldsAvailability,
};
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

async function getFieldsAvailability({
  sportsCenterId,
  startsAt,
  durationMinutes,
}) {
  if (!sportsCenterId || Number.isNaN(sportsCenterId)) {
    throw new AppError("Sports center id is required", 400);
  }

  if (!startsAt) {
    throw new AppError("startsAt is required", 400);
  }

  if (!durationMinutes || Number.isNaN(durationMinutes)) {
    throw new AppError("durationMinutes is required", 400);
  }

  const newStart = new Date(startsAt);

  if (Number.isNaN(newStart.getTime())) {
    throw new AppError("Invalid startsAt", 400);
  }

  const newEnd = getMatchEndDate(newStart, durationMinutes);

  const fields = await fieldsRepository.findFieldsBySportsCenterId(
    sportsCenterId
  );

  if (fields.length === 0) {
    return [];
  }

  const fieldIds = fields.map((field) => field.id);

  const activeMatches = await fieldsRepository.findActiveMatchesByFieldIds(
    fieldIds
  );

  return fields.map((field) => {
    const conflictingMatch = activeMatches.find((match) => {
      return match.fieldId === field.id && hasTimeOverlap(match, newStart, newEnd);
    });

    return {
      ...field,
      isAvailable: !conflictingMatch,
      unavailableReason: conflictingMatch
        ? "Campo già occupato in questo orario"
        : null,
    };
  });
}

module.exports = {
  getAllFields,
  getFieldById,
  getFieldsAvailability,
};
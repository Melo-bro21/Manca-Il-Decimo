const sportsCenterRepository = require("./sports-centers.repository");
const { AppError } = require("../../shared/errors");

async function getAllSportsCenters() {
  return sportsCenterRepository.findAllSportsCenters();
}

async function getSportsCenterById(id) {
  const sportsCenter = await sportsCenterRepository.findSportsCenterById(id);

  if (!sportsCenter) {
    throw new AppError("Sports center not found", 404);
  }

  return sportsCenter;
}

async function getFieldsBySportsCenterId(sportsCenterId) {
  const sportsCenter = await sportsCenterRepository.findSportsCenterById(
    sportsCenterId
  );

  if (!sportsCenter) {
    throw new AppError("Sports center not found", 404);
  }

  return sportsCenterRepository.findFieldsBySportsCenterId(sportsCenterId);
}

module.exports = {
  getAllSportsCenters,
  getSportsCenterById,
  getFieldsBySportsCenterId,
};
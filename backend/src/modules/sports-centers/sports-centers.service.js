const prisma = require("../../prisma/prismaClient");
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

async function createSportsCenter(data) {
  return await prisma.sportsCenter.create({
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      phone: data.phone,
      ownerId: data.ownerId, // Questo collega il centro al proprietario
      latitude: data.latitude, // Opzionale
      longitude: data.longitude // Opzionale
    }
  });
}

module.exports = {
  getAllSportsCenters,
  getSportsCenterById,
  getFieldsBySportsCenterId,
  createSportsCenter, // Esportiamo la funzione per creare un centro sportivo
};
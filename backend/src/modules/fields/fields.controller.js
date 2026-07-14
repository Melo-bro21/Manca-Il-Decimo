const fieldService = require("./fields.service");

async function getAllFields(req, res, next) {
  try {
    const fields = await fieldService.getAllFields();

    res.status(200).json({
      message: "Fields retrieved successfully",
      data: fields,
    });
  } catch (error) {
    next(error);
  }
}

async function getFieldById(req, res, next) {
  try {
    const fieldId = Number(req.params.id);
    const field = await fieldService.getFieldById(fieldId);

    res.status(200).json({
      message: "Field retrieved successfully",
      data: field,
    });
  } catch (error) {
    next(error);
  }
}

async function getFieldsAvailability(req, res, next) {
  try {
    const sportsCenterId = Number(req.query.sportsCenterId);
    const startsAt = req.query.startsAt;
    const durationMinutes = Number(req.query.durationMinutes);

    const fields = await fieldService.getFieldsAvailability({
      sportsCenterId,
      startsAt,
      durationMinutes,
    });

    res.status(200).json({
      message: "Fields availability retrieved successfully",
      data: fields,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllFields,
  getFieldById,
  getFieldsAvailability,
};
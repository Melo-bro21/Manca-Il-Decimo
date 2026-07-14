const suspensionAppealsService = require("./suspension-appeals.service");

async function getMySuspensionAppealStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const result =
      await suspensionAppealsService.getMySuspensionAppealStatus(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function createAppeal(req, res, next) {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    const appeal = await suspensionAppealsService.createAppeal({
      userId,
      message,
    });

    return res.status(201).json({
      success: true,
      message:
        "Richiesta di revisione inviata. Un admin la valuterà.",
      data: appeal,
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminAppeals(req, res, next) {
  try {
    const { status } = req.query;

    const appeals = await suspensionAppealsService.getAdminAppeals({
      status,
    });

    return res.status(200).json({
      success: true,
      data: appeals,
    });
  } catch (error) {
    next(error);
  }
}

async function rejectAppeal(req, res, next) {
  try {
    const adminId = req.user.id;
    const appealId = Number(req.params.id);
    const { adminNote } = req.body;

    const appeal = await suspensionAppealsService.rejectAppeal({
      adminId,
      appealId,
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message: "Revisione respinta. L’utente è stato notificato.",
      data: appeal,
    });
  } catch (error) {
    next(error);
  }
}

async function approveAppeal(req, res, next) {
  try {
    const adminId = req.user.id;
    const appealId = Number(req.params.id);
    const { adminNote } = req.body;

    const result = await suspensionAppealsService.approveAppeal({
      adminId,
      appealId,
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message:
        "Revisione accolta. La sospensione è stata rimossa e l’utente è stato notificato.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMySuspensionAppealStatus,
  createAppeal,
  getAdminAppeals,
  rejectAppeal,
  approveAppeal,
};
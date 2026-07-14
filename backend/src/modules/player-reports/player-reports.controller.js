const playerReportsService = require("./player-reports.service");

async function getMatchManagement(req, res, next) {
  try {
    const userId = req.user.id;
    const matchId = Number(req.params.id);

    const result = await playerReportsService.getMatchManagement({
      userId,
      matchId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function createPlayerReport(req, res, next) {
  try {
    const reporterId = req.user.id;
    const matchId = Number(req.params.id);
    const { reportedUserId, reason, description } = req.body;

    const report = await playerReportsService.createPlayerReport({
      reporterId,
      matchId,
      reportedUserId: Number(reportedUserId),
      reason,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Segnalazione inviata. Un admin la valuterà.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminReports(req, res, next) {
  try {
    const { status } = req.query;

    const reports = await playerReportsService.getAdminReports({
      status,
    });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
}

async function ignoreReport(req, res, next) {
  try {
    const adminId = req.user.id;
    const reportId = Number(req.params.id);
    const { adminNote } = req.body;

    const report = await playerReportsService.ignoreReport({
      adminId,
      reportId,
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message: "Segnalazione ignorata",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function resolveReport(req, res, next) {
  try {
    const adminId = req.user.id;
    const reportId = Number(req.params.id);
    const { adminNote } = req.body;

    const report = await playerReportsService.resolveReport({
      adminId,
      reportId,
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message: "Segnalazione risolta",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function suspendUserFromReport(req, res, next) {
  try {
    const adminId = req.user.id;
    const reportId = Number(req.params.id);
    const { days, adminNote } = req.body;

    const result = await playerReportsService.suspendUserFromReport({
      adminId,
      reportId,
      days: Number(days),
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message: "Utente sospeso dalle partite",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSuspendedUsers(req, res, next) {
  try {
    const users = await playerReportsService.getSuspendedUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

async function unsuspendUser(req, res, next) {
  try {
    const adminId = req.user.id;
    const userId = Number(req.params.id);
    const { adminNote } = req.body;

    const user = await playerReportsService.unsuspendUser({
      adminId,
      userId,
      adminNote,
    });

    return res.status(200).json({
      success: true,
      message: "Sospensione rimossa",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMatchManagement,
  createPlayerReport,
  getAdminReports,
  ignoreReport,
  resolveReport,
  suspendUserFromReport,
  getSuspendedUsers,
  unsuspendUser,
};
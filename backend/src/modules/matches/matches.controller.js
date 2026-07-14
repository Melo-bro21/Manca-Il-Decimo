const matchesService = require("./matches.service");

async function getMatches(req, res, next) {
  try {
    const matches = await matchesService.getMatches();

    res.status(200).json({
      data: matches,
    });
  } catch (error) {
    next(error);
  }
}

async function getMatchById(req, res, next) {
  try {
    const matchId = Number(req.params.id);

    const match = await matchesService.getMatchById(matchId);

    res.status(200).json({
      data: match,
    });
  } catch (error) {
    next(error);
  }
}

async function createMatch(req, res, next) {
  try {
    const creatorId = req.user.id;

    const match = await matchesService.createMatch({
      creatorId: creatorId,
      matchData: req.body,
    });

    res.status(201).json({
      data: match,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelMatch(req, res, next) {
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;

    const match = await matchesService.cancelMatch({
      matchId: matchId,
      userId: userId,
    });

    res.status(200).json({
      data: match,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMatches,
  getMatchById,
  createMatch,
  cancelMatch,
};
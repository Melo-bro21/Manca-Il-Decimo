const disciplinaryCardsService = require(
  "./disciplinary-cards.service"
);

async function getMyDisciplinaryState(req, res, next) {
  try {
    const userId = req.user.id;

    const state =
      await disciplinaryCardsService.getDisciplinaryState(
        userId
      );

    res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyDisciplinaryState,
};
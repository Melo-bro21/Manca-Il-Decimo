const usersService = require('./users.service');

async function getMe(req, res, next) {
  try {
    const user = await usersService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Profilo utente recuperato',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateMe(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profilo utente aggiornato',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    await usersService.changePassword(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Password aggiornata correttamente',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

async function activatePremium(req, res, next) {
  try {
    const result = await usersService.activatePremium(req.user.id);

    res.status(200).json({
      success: true,
      message: result.alreadyPremium
        ? 'Premium già attivo'
        : 'Premium attivato correttamente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
  
module.exports = {
  getMe,
  updateMe,
  changePassword,
  activatePremium,
};
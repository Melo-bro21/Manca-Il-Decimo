const walletService = require("./wallet.service");

async function getMyWallet(req, res, next) {
  try {
    const userId = req.user.id;

    const wallet = await walletService.getMyWallet(userId);

    res.status(200).json({
      wallet,
    });
  } catch (error) {
    next(error);
  }
}

async function topUpWallet(req, res, next) {
  try {
    const userId = req.user.id;
    const { amount, reason } = req.body;

    const result = await walletService.topUpWallet({
      userId,
      amount,
      reason,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getMyTransactions(req, res, next) {
  try {
    const userId = req.user.id;

    const transactions = await walletService.getMyTransactions(userId);

    res.status(200).json({
      transactions,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyWallet,
  topUpWallet,
  getMyTransactions,
};
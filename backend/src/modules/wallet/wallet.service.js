const { prisma } = require("../../shared/prisma");
const walletRepository = require("./wallet.repository");


async function getOrCreateWallet(userId) {
  let wallet = await walletRepository.findWalletByUserId(userId);

  if (!wallet) {
    wallet = await walletRepository.createWallet(userId);
  }

  return wallet;
}

async function getMyWallet(userId) {
  const wallet = await getOrCreateWallet(userId);

  return wallet;
}

async function topUpWallet({ userId, amount, reason }) {
  const result = await prisma.$transaction(async (transiction) => {
    let wallet = await transiction.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      wallet = await transiction.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    const updatedWallet = await transiction.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: wallet.balance + amount,
      },
    });

    const transaction = await transiction.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "TOP_UP",
        reason: reason || "Ricarica simulata",
      },
    });

    return {
      wallet: updatedWallet,
      transaction,
    };
  });

  return result;
}

async function getMyTransactions(userId) {
  const wallet = await getOrCreateWallet(userId);

  const transactions = await walletRepository.findTransactionsByWalletId(wallet.id);

  return transactions;
}

module.exports = {
  getMyWallet,
  topUpWallet,
  getMyTransactions,
};

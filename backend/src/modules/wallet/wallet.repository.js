const { prisma } = require("../../shared/prisma");

function findWalletByUserId(userId) {
  return prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

function createWallet(userId) {
  return prisma.wallet.create({
    data: {
      userId,
      balance: 0,
    },
  });
}

function findTransactionsByWalletId(walletId) {
  return prisma.walletTransaction.findMany({
    where: {
      walletId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

module.exports = {
  findWalletByUserId,
  createWallet,
  findTransactionsByWalletId,
};
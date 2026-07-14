  const bcrypt = require('bcrypt');
  
  const { prisma } = require('../../shared/prisma');
  const usersRepository = require('./users.repository');
  const { AppError } = require('../../shared/errors');
  

  function sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async function getMe(userId) {
    const user = await usersRepository.findUserById(userId);

    if (!user) {
      throw new AppError('Utente non trovato', 404);
    }

    return sanitizeUser(user);
  }

  async function updateMe(userId, data) {
    const user = await usersRepository.findUserById(userId);

    if (!user) {
      throw new AppError('Utente non trovato', 404);
    }

    if (data.email !== undefined && data.email !== user.email) {
      const existingUser = await usersRepository.findUserByEmail(data.email);

      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Email già registrata', 409);
      }
    }

 const updateData = {
  ...(data.name !== undefined && { name: data.name }),
  ...(data.email !== undefined && { email: data.email }),
  ...(data.phone !== undefined && { phone: data.phone }),
  ...(data.preferredRole !== undefined && { preferredRole: data.preferredRole }),
};
    const updatedUser = await usersRepository.updateUser(userId, updateData);

    return sanitizeUser(updatedUser);
  }

  async function changePassword(userId, data) {
    const user = await usersRepository.findUserById(userId);

    if (!user) {
      throw new AppError('Utente non trovato', 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new AppError('Password attuale non corretta', 401);
    }

    const isSamePassword = await bcrypt.compare(
      data.newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      throw new AppError('La nuova password deve essere diversa da quella attuale', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    const updatedUser = await usersRepository.updateUserPassword(userId, passwordHash);

    return sanitizeUser(updatedUser);
  }

async function activatePremium(userId) {
  const premiumPrice = 5;

  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError('Utente non trovato', 404);
    }

    if (user.isPremium) {
      return {
        user,
        wallet: null,
        transaction: null,
        alreadyPremium: true,
      };
    }

    let wallet = await transaction.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      wallet = await transaction.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    if (wallet.balance < premiumPrice) {
      throw new AppError(
        'Saldo wallet insufficiente per acquistare Premium',
        400
      );
    }

    const updatedWallet = await transaction.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: wallet.balance - premiumPrice,
      },
    });

    const walletTransaction = await transaction.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -premiumPrice,
        type: 'PREMIUM_PURCHASE',
        reason: 'Acquisto Premium demo',
      },
    });

    const updatedUser = await transaction.user.update({
      where: {
        id: userId,
      },
      data: {
        isPremium: true,
      },
    });

    return {
      user: updatedUser,
      wallet: updatedWallet,
      transaction: walletTransaction,
      alreadyPremium: false,
    };
  });

  return {
    user: sanitizeUser(result.user),
    wallet: result.wallet,
    transaction: result.transaction,
    alreadyPremium: result.alreadyPremium,
  };
}

  module.exports = {
    getMe,
    updateMe,
    changePassword,
    activatePremium,
  };
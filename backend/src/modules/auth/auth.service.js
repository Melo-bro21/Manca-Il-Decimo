const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const authRepository = require("./auth.repository");
const emailService = require("../../shared/email.service");
const { AppError } = require("../../shared/errors");
const env = require("../../config/env");

const prismaModule = require("../../shared/prisma");
const prisma = prismaModule.prisma || prismaModule;

const PASSWORD_RESET_TOKEN_MINUTES = 15;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

const buildSafeUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    reliabilityScore: user.reliabilityScore,
    preferredRole: user.preferredRole,
    isPremium: user.isPremium,
  };
};

const register = async (userData) => {
  const existingUser = await authRepository.findUserByEmail(userData.email);

  if (existingUser) {
    throw new AppError("Email già registrata", 409);
  }

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const user = await authRepository.createUser({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    passwordHash,
  });

  let welcomeEmailSent = false;

  try {
    const emailResult = await emailService.sendWelcomeEmail({
      to: user.email,
      name: user.name,
    });

    welcomeEmailSent = emailResult.sent === true;
  } catch (error) {
    console.error("Errore invio email di benvenuto:", error.message);
  }

  const token = generateToken(user);

  return {
    user: buildSafeUser(user),
    token,
    welcomeEmailSent,
  };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new AppError("Credenziali non valide", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Credenziali non valide", 401);
  }

  const token = generateToken(user);

  return {
    user: buildSafeUser(user),
    token,
  };
};

const forgotPassword = async ({ email }) => {
  const user = await authRepository.findUserByEmail(email);

  /*
    Importante:
    anche se la mail non esiste, rispondiamo comunque OK.
    Così nessuno può scoprire quali email sono registrate.
  */
  if (!user) {
    return {
      resetEmailSent: false,
    };
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  const resetToken = crypto.randomBytes(24).toString("hex");

  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000
  );

  await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      expiresAt,
      used: false,
      userId: user.id,
    },
  });

  const frontendUrl = env.frontendUrl || "http://localhost:8100";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  let resetEmailSent = false;

  try {
    const emailResult = await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink,
      expiresAt,
    });

    resetEmailSent = emailResult.sent === true;
  } catch (error) {
    console.error("Errore invio email reset password:", error.message);
  }

  return {
    resetEmailSent,
    expiresAt,
  };
};

const resetPassword = async ({ token, newPassword }) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!resetToken) {
    throw new AppError("Token di recupero non valido", 400);
  }

  if (resetToken.used) {
    throw new AppError("Token di recupero già utilizzato", 400);
  }

  if (resetToken.expiresAt < new Date()) {
    throw new AppError("Token di recupero scaduto", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        used: true,
      },
    });
  });

  return {
    userId: resetToken.userId,
  };
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
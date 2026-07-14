const { prisma } = require("./prisma");
const { AppError } = require("./errors");

function isSuspensionActive(user) {
  if (!user?.suspendedUntil) {
    return false;
  }

  return new Date(user.suspendedUntil) > new Date();
}

function formatSuspensionDate(date) {
  return new Date(date).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getUserSuspensionState(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const suspended = isSuspensionActive(user);

  return {
    suspended,
    suspendedUntil: user.suspendedUntil,
    suspensionReason: user.suspensionReason,
    role: user.role,
  };
}

async function ensureUserCanUseMatchFeatures(userId) {
  const state = await getUserSuspensionState(userId);

  if (state.role === "ADMIN") {
    throw new AppError(
      "Gli account admin non possono creare o partecipare alle partite",
      403
    );
  }

  if (state.suspended) {
    const untilLabel = formatSuspensionDate(state.suspendedUntil);

    throw new AppError(
      `Il tuo account è sospeso dalle partite fino al ${untilLabel}. Durante la sospensione puoi usare l’app, ma non puoi creare o partecipare a partite.`,
      403
    );
  }

  return true;
}

module.exports = {
  getUserSuspensionState,
  ensureUserCanUseMatchFeatures,
  isSuspensionActive,
};
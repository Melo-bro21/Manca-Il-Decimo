const { AppError } = require("../shared/errors");

function centerOwnerMiddleware(req, res, next) {
  if (!req.user) {
    throw new AppError("Utente non autenticato", 401);
  }

  // Permettiamo l'accesso a questa rotta solo ai PROPRIETARI (e agli ADMIN che possono fare tutto)
  if (req.user.role !== "CENTER_OWNER" && req.user.role !== "ADMIN") {
    throw new AppError("Accesso riservato ai proprietari dei centri sportivi", 403);
  }

  next();
}

module.exports = centerOwnerMiddleware;
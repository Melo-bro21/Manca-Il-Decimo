const { AppError } = require("../shared/errors");

function adminMiddleware(req, res, next) {
  if (!req.user) {
    throw new AppError("Utente non autenticato", 401);
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError("Accesso riservato agli admin", 403);
  }

  next();
}

module.exports = adminMiddleware;
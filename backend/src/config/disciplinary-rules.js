const DISCIPLINARY_RULES = Object.freeze({
  /**
   * Un'uscita effettuata entro questa finestra prima dell'inizio
   * della partita produce un cartellino giallo.
   */
  lateCancellationWindowMinutes: 60,

  /**
   * Durata provvisoria del cartellino giallo.
   */
  yellowCardDurationDays: 7,

  /**
   * Durata provvisoria del cartellino rosso.
   */
  redCardDurationDays: 7,
});

module.exports = {
  DISCIPLINARY_RULES,
};
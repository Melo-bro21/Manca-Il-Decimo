const { z } = require("zod");

const matchIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const confirmWaitlistPresenceSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    paymentMethod: z.enum(["WALLET", "ON_SITE"]).default("WALLET"),
  }),
});

module.exports = {
  matchIdParamSchema,
  confirmWaitlistPresenceSchema,
};
const { z } = require("zod");

const topUpSchema = z.object({
  body: z.object({
    amount: z.number().int().positive("L'importo deve essere positivo"),
    reason: z.string().optional(),
  }),
});

module.exports = {
  topUpSchema,
};
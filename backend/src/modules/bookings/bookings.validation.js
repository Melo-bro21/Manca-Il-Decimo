const { z } = require("zod");

const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Booking id is required"),
  }),
});

const joinMatchSchema = z.object({
  body: z
    .object({
      paymentMethod: z.enum(["WALLET", "ON_SITE"]).optional(),
    })
    .optional(),

  params: z.object({
    id: z.string().min(1, "Match id is required"),
  }),
});

module.exports = {
  joinMatchSchema,
  bookingIdParamSchema,
};
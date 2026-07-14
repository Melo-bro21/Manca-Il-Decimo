const { z } = require("zod");

const guestSchema = z.object({
  name: z.string().trim().min(2, "Guest name must be at least 2 characters"),
  preferredRole: z.enum(
    ["PORTIERE", "DIFENSORE", "CENTROCAMPISTA", "ATTACCANTE"],
    {
      message:
        "preferredRole must be PORTIERE, DIFENSORE, CENTROCAMPISTA or ATTACCANTE",
    }
  ),
});

const createMatchSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),

    description: z.string().optional(),

    fieldId: z
      .number()
      .int()
      .positive("Field id must be a positive number"),

    startsAt: z.string().datetime("startsAt must be a valid ISO date"),

    durationMinutes: z.number().int().positive("Duration must be positive"),

    maxPlayers: z.number().int().min(2).max(22),

    pricePerPlayer: z.number().int().min(0, "Price cannot be negative"),

    depositAmount: z.number().int().min(0, "Deposit cannot be negative"),

    onlyReliableUsers: z.boolean().optional(),

    minReliabilityScore: z.number().int().min(0).max(100).optional(),

    requiresApproval: z.boolean().optional(),

    guests: z.array(guestSchema).max(21).optional(),
  }),
});

module.exports = {
  createMatchSchema,
};
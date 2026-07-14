const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Il nome deve contenere almeno 2 caratteri"),

    email: z
      .string()
      .email("Email non valida"),

    phone: z
      .string()
      .optional(),

    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Email non valida"),

    password: z
      .string()
      .min(1, "La password è obbligatoria"),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Email non valida"),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(10, "Token non valido"),

    newPassword: z
      .string()
      .min(8, "La nuova password deve contenere almeno 8 caratteri"),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
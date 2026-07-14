const { z } = require('zod');

const preferredRoleSchema = z.enum([
  'PORTIERE',
  'DIFENSORE',
  'CENTROCAMPISTA',
  'ATTACCANTE',
]);

const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Il nome deve contenere almeno 2 caratteri').optional(),
      email: z.string().email('Email non valida').optional(),
      phone: z.string().min(6, 'Il telefono deve contenere almeno 6 caratteri').optional(),
      preferredRole: preferredRoleSchema.optional(),
    })
    .strict(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'La password attuale è obbligatoria'),
      newPassword: z.string().min(8, 'La nuova password deve contenere almeno 8 caratteri'),
      confirmPassword: z.string().min(8, 'La conferma password deve contenere almeno 8 caratteri'),
    })
    .strict()
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'La nuova password e la conferma password non coincidono',
      path: ['confirmPassword'],
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  updateMeSchema,
  changePasswordSchema,
};
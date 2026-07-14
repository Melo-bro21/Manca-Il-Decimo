const { z } = require("zod");

const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification id is required"),
  }),
});

module.exports = {
  notificationIdParamSchema,
};
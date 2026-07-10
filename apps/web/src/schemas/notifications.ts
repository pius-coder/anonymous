import { z } from "zod";

export const notificationEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});

export type NotificationEntry = z.infer<typeof notificationEntrySchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

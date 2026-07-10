import { z } from "zod";

export const catalogueSessionSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  entryFee: z.number(),
  maxPlayers: z.number(),
  prizePool: z.number(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  status: z.string(),
  visibility: z.string(),
});

export const sessionDetailSchema = catalogueSessionSchema.extend({
  placesRemaining: z.number(),
  registrationCount: z.number(),
});

export type CatalogueSession = z.infer<typeof catalogueSessionSchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;

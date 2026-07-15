import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default("/api"),
  NEXT_PUBLIC_LIVE_ENDPOINT: z.string().min(1).optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_LIVE_ENDPOINT: process.env.NEXT_PUBLIC_LIVE_ENDPOINT,
});


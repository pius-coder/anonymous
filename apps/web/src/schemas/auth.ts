import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(128),
  username: z.string().min(3).max(32),
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().min(6).max(32).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

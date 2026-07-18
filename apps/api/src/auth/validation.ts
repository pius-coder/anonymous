import { z } from "zod";

function trimmedName() {
  return z.string().min(1, { error: "Le nom est requis" }).max(50).transform((val) => val.trim());
}

export const registerSchema = z.object({
  email: z.email().transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, { error: "Le mot de passe doit contenir au moins 8 caractères" }).max(128, { error: "Le mot de passe est trop long" }),
  name: trimmedName().optional().nullable().transform((val) => val || undefined),
});

export const loginSchema = z.object({
  email: z.email().transform((val) => val.toLowerCase().trim()),
  password: z.string(),
});

export const passwordResetRequestSchema = z.object({
  email: z.email().transform((val) => val.toLowerCase().trim()),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, { error: "Le mot de passe doit contenir au moins 8 caractères" }).max(128, { error: "Le mot de passe est trop long" }),
});

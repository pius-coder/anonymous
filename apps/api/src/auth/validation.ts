import { z } from "zod";

export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Email invalide"),
);

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(128, "Le mot de passe doit contenir au plus 128 caractères");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Le pseudo doit contenir au moins 3 caractères")
  .max(32, "Le pseudo doit contenir au plus 32 caractères")
  .regex(/^[a-zA-Z0-9_-]+$/, "Le pseudo peut contenir lettres, chiffres, _ et -");

function optionalTrimmedString(schema: z.ZodString) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, schema.optional());
}

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  name: optionalTrimmedString(z.string().min(1, "Le nom affiché ne peut pas être vide").max(100)),
  phone: optionalTrimmedString(
    z.string().min(6, "Le téléphone doit contenir au moins 6 caractères").max(32),
  ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis").max(128),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

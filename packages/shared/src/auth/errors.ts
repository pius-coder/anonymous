// Erreurs auth — codes alignés sur common/v1/errors.proto ErrorCode
// Source de vérité canonique : packages/contracts/proto/common/v1/errors.proto

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: { code: "INVALID_CREDENTIALS", status: 401, message: "Email ou mot de passe incorrect" },
  EMAIL_ALREADY_EXISTS: { code: "ALREADY_EXISTS", status: 409, message: "Cet email est déjà utilisé" },
  SESSION_EXPIRED: { code: "SESSION_EXPIRED", status: 401, message: "Session expirée, veuillez vous reconnecter" },
  SESSION_REVOKED: { code: "SESSION_REVOKED", status: 401, message: "Session révoquée" },
  UNAUTHORIZED: { code: "UNAUTHENTICATED", status: 401, message: "Authentification requise" },
  FORBIDDEN: { code: "PERMISSION_DENIED", status: 403, message: "Accès refusé : rôle insuffisant" },
  RATE_LIMITED: { code: "RATE_LIMITED", status: 429, message: "Trop de tentatives, réessayez plus tard" },
  USER_NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Utilisateur introuvable" },
  WEAK_PASSWORD: { code: "WEAK_PASSWORD", status: 400, message: "Le mot de passe doit contenir au moins 8 caractères" },
  INVALID_PASSWORD_RESET_TOKEN: { code: "INVALID_RESET_TOKEN", status: 400, message: "Lien de réinitialisation invalide ou expiré" },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export type AuthErrorInfo = (typeof AUTH_ERRORS)[AuthErrorCode];

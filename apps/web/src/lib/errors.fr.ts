export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Email ou mot de passe incorrect",
  EMAIL_ALREADY_EXISTS: "Cet email est déjà utilisé",
  SESSION_EXPIRED: "Session expirée, veuillez vous reconnecter",
  SESSION_REVOKED: "Session révoquée",
  UNAUTHORIZED: "Authentification requise",
  FORBIDDEN: "Accès refusé",
  RATE_LIMITED: "Trop de tentatives. Réessayez plus tard",
  WEAK_PASSWORD: "Le mot de passe doit contenir au moins 8 caractères",
  USER_NOT_FOUND: "Utilisateur introuvable",
  NETWORK_ERROR: "Erreur réseau. Vérifiez votre connexion",
};

export function translateError(code: string): string {
  return ERROR_MESSAGES[code] ?? "Une erreur est survenue";
}

export type ErrorCode = string;

const FR: Record<string, string> = {
  // Auth
  UNAUTHENTICATED: "Tu dois être connecté pour continuer.",
  INVALID_CREDENTIALS: "Email ou mot de passe incorrect.",
  LOGIN_RATE_LIMITED: "Trop de tentatives. Réessaie plus tard.",
  ACCOUNT_DISABLED: "Ton compte est désactivé. Contacte le support.",
  EMAIL_ALREADY_USED: "Cet email est déjà utilisé.",
  PHONE_ALREADY_USED: "Ce numéro est déjà utilisé.",
  USERNAME_ALREADY_USED: "Ce pseudo est déjà pris.",
  VALIDATION_ERROR: "Vérifie les champs saisis.",
  RESET_TOKEN_EXPIRED: "Le lien de réinitialisation a expiré.",
  RESET_TOKEN_INVALID: "Le lien de réinitialisation est invalide.",
  PASSWORD_RESET_RATE_LIMITED: "Trop de demandes de réinitialisation. Réessaie plus tard.",
  INTERNAL_AUTH_REQUIRED: "Authentification interne requise.",
  ROLE_REQUIRED: "Tes permissions sont insuffisantes pour cette action.",

  // Sessions / inscription
  SESSION_NOT_FOUND: "Session introuvable.",
  SESSION_NOT_VISIBLE: "Cette session n'est pas accessible.",
  SESSION_CANCELLED: "Cette session a été annulée.",
  SESSION_NOT_PUBLISHED: "Cette session n'est pas encore publiée.",
  SESSION_PRIVATE: "Cette session est privée : invitation requise.",
  SESSION_FULL: "La session est complète.",
  SESSION_NOT_LIVE: "La session n'est pas en direct.",
  SESSION_NOT_STARTABLE: "La session ne peut pas démarrer maintenant.",
  REGISTRATION_CLOSED: "Les inscriptions sont fermées.",
  ALREADY_REGISTERED: "Tu es déjà inscrit à cette session.",
  REGISTRATION_NOT_FOUND: "Inscription introuvable.",
  REGISTRATION_EXPIRED: "Ton inscription a expiré.",
  REGISTRATION_ALREADY_PAID: "Cette inscription est déjà payée.",
  REGISTRATION_NOT_PAYABLE: "Cette inscription n'est plus payable.",
  REGISTRATION_FORBIDDEN: "Tu ne peux pas modifier cette inscription.",
  NOT_PAID: "Tu dois payer pour accéder à cette session.",
  NOT_CHECKED_IN: "Tu dois te signaler (check-in) avant de rejoindre.",
  CHECKIN_CLOSED: "Le check-in est fermé.",

  // Paiement / wallet
  PAYMENT_NOT_FOUND: "Paiement introuvable.",
  PAYMENT_FORBIDDEN: "Tu ne peux pas accéder à ce paiement.",
  PAYMENT_AMOUNT_TOO_LOW: "Le montant du paiement est trop bas.",
  PROVIDER_UNAVAILABLE: "Le prestataire de paiement est indisponible. Réessaie.",
  WALLET_FROZEN: "Ton portefeuille est temporairement bloqué.",
  INSUFFICIENT_FUNDS: "Solde insuffisant dans ton portefeuille.",
  LEDGER_DUPLICATE: "Opération déjà enregistrée (doublon).",
  WITHDRAWALS_DISABLED: "Les retraits ne sont pas encore disponibles.",

  // Live / Colyseus
  JOIN_TOKEN_INVALID: "Ton jeton de connexion est invalide.",
  JOIN_TOKEN_EXPIRED: "Ton jeton de connexion a expiré.",
  JOIN_TOKEN_USED: "Ce jeton de connexion a déjà été utilisé.",
  LIVE_ENTRY_LOCKED: "Le round en cours est déjà verrouillé pour ce mini-jeu.",
  RECONNECT_WINDOW_EXPIRED: "La fenêtre de reconnexion est dépassée.",

  // Rounds / résolution
  ROUND_NOT_FOUND: "Round introuvable.",
  ROUND_ALREADY_CLOSED: "Ce round est déjà clôturé.",
  ROUND_NOT_LOCKED: "Ce round n'est pas encore verrouillé.",
  INVALID_ROUND_INPUT: "Réponse de round invalide.",
  RESOLUTION_NOT_FOUND: "Résolution introuvable.",
  RESULTS_NOT_FINALIZED: "Les résultats ne sont pas encore finalisés.",
  RESULTS_FORBIDDEN: "Tu ne peux pas voir ces résultats.",
  SESSION_NOT_READY_TO_FINALIZE: "La session n'est pas prête à être finalisée.",
  TIE_POLICY_REQUIRED: "Politique d'égalité manquante.",
  PAID_REGISTRATIONS_EXIST: "Impossible : des inscriptions payées existent.",
  CONFIG_VERSION_CONFLICT: "La configuration a été modifiée. Rafraîchis et réessaie.",

  // Mini-jeux
  MINIGAME_NOT_FOUND: "Mini-jeu introuvable.",
  MINIGAME_DISABLED: "Ce mini-jeu est désactivé.",
  INVALID_MINIGAME_CONFIG: "Configuration de mini-jeu invalide.",

  // Erreurs génériques
  HTTP_ERROR: "Une erreur est survenue.",
  NETWORK_ERROR: "Réseau injoignable. Vérifie ta connexion.",
  PAYLOAD_TOO_LARGE: "La requête est trop volumineuse.",
  RATE_LIMITED: "Trop de requêtes. Ralentis un peu.",
  ACTION_NOT_FOUND: "Action introuvable.",
  USER_NOT_FOUND: "Utilisateur introuvable.",
  NOTIFICATION_NOT_FOUND: "Notification introuvable.",
  INVALID_SESSION: "Session invalide.",
  INVALID_WEBHOOK_SECRET: "Secret webhook invalide.",
  "403_COMPLIANCE_GATE_BLOCKED":
    "Publication bloquée : la session ne passe pas la conformité légale. Débloque le gate dans Conformité.",
  SESSION_ALREADY_COMPLETED: "La session est déjà terminée.",
  SESSION_CLOSED: "Cette session est fermée.",
  LINK_NOT_FOUND: "Lien introuvable.",
  MIN_PLAYERS_NOT_REACHED: "Le nombre minimum de joueurs n'est pas atteint.",
  "404_PLAYER_NOT_FOUND": "Joueur introuvable.",
  INVALID_CAPACITY: "Capacité invalide.",
  INVALID_ENTRY_FEE: "Frais d'inscription invalides.",
  INVALID_BPS: "Pourcentage invalide.",
  INVALID_PRIZE_SPLIT: "Répartition des gains invalide.",
  INVALID_START_TIME: "Date de début invalide.",
  INVALID_REGISTRATION_CLOSE: "Date de clôture des inscriptions invalide.",
};

const GENERIC_STATUS: Record<number, string> = {
  400: "Requête invalide.",
  401: "Authentification requise.",
  403: "Action interdite.",
  404: "Introuvable.",
  409: "Conflit — l'action ne peut pas aboutir.",
  410: "Cette ressource n'est plus disponible.",
  422: "Données non traitables.",
  423: "Ressource verrouillée.",
  429: "Trop de requêtes. Réessaie plus tard.",
  500: "Erreur serveur. Réessaie.",
  502: "Service indisponible. Réessaie.",
};

export function translateError(code: string, fallbackStatus = 0): string {
  return FR[code] ?? (fallbackStatus ? GENERIC_STATUS[fallbackStatus] : "Une erreur est survenue.");
}

export function formatRateLimit(resetAt?: number): string {
  if (!resetAt) return "";
  const seconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
  if (seconds < 60) return `Réessaie dans ${seconds}s.`;
  const m = Math.ceil(seconds / 60);
  return `Réessaie dans ${m} min.`;
}

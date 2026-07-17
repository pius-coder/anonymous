export const PAYMENT_ERRORS = {
  PAYMENT_INITIATION_FAILED: { code: "PAYMENT_INITIATION_FAILED", status: 502, message: "Échec de l'initiation du paiement" },
  PAYMENT_NOT_FOUND: { code: "PAYMENT_NOT_FOUND", status: 404, message: "Transaction introuvable" },
  PAYMENT_ALREADY_COMPLETED: { code: "ALREADY_EXISTS", status: 409, message: "Ce paiement est déjà terminé" },
  PAYMENT_EXPIRED: { code: "PAYMENT_EXPIRED", status: 410, message: "Ce paiement a expiré" },
  WALLET_NOT_FOUND: { code: "WALLET_NOT_FOUND", status: 404, message: "Portefeuille introuvable" },
  WALLET_FROZEN: { code: "FAILED_PRECONDITION", status: 422, message: "Portefeuille bloqué : opération impossible" },
  INSUFFICIENT_BALANCE: { code: "INSUFFICIENT_BALANCE", status: 422, message: "Solde insuffisant" },
  LEDGER_ENTRY_NOT_FOUND: { code: "LEDGER_ENTRY_NOT_FOUND", status: 404, message: "Entrée de ledger introuvable" },
  DUPLICATE_IDEMPOTENCY_KEY: { code: "ALREADY_EXISTS", status: 409, message: "Une opération avec cette clé d'idempotence existe déjà" },
  INVALID_AMOUNT: { code: "INVALID_ARGUMENT", status: 400, message: "Le montant doit être supérieur à zéro" },
  PROVIDER_ERROR: { code: "PROVIDER_ERROR", status: 502, message: "Erreur du fournisseur de paiement" },
  WEBHOOK_SIGNATURE_INVALID: { code: "UNAUTHENTICATED", status: 401, message: "Signature webhook invalide" },
  PROVIDER_NOT_CONFIGURED: {
    code: "PROVIDER_NOT_CONFIGURED",
    status: 503,
    message: "Fournisseur de paiement non configuré",
  },
  PROVIDER_TIMEOUT_AMBIGUOUS: {
    code: "PROVIDER_TIMEOUT_AMBIGUOUS",
    status: 504,
    message: "Timeout fournisseur ambigu — réconciliation requise, pas de nouvel initiate",
  },
  CHECKOUT_LINK_REJECTED: {
    code: "CHECKOUT_LINK_REJECTED",
    status: 502,
    message: "Lien de checkout fournisseur refusé (hôte non autorisé)",
  },
  WEBHOOK_SECRET_REQUIRED: {
    code: "WEBHOOK_SECRET_REQUIRED",
    status: 503,
    message: "Secret webhook Fapshi obligatoire",
  },
  COLLECTION_DISABLED: {
    code: "COLLECTION_DISABLED",
    status: 503,
    message: "Collecte Fapshi désactivée (kill switch)",
  },
  FINANCE_FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Commande finance réservée au rôle FINANCE" },
  STEP_UP_REQUIRED: { code: "FAILED_PRECONDITION", status: 403, message: "Step-up / MFA finance requis" },
  MAKER_CHECKER_REQUIRED: {
    code: "FAILED_PRECONDITION",
    status: 403,
    message: "Approbation maker-checker requise (autre opérateur FINANCE)",
  },
  VELOCITY_LIMIT: { code: "RESOURCE_EXHAUSTED", status: 429, message: "Limite de vélocité finance atteinte" },
  FRAUD_HOLD: { code: "FAILED_PRECONDITION", status: 422, message: "Opération bloquée (hold fraude)" },
  COMPENSATION_NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Demande de compensation introuvable" },
  PROVIDER_AMBIGUOUS: {
    code: "PROVIDER_AMBIGUOUS",
    status: 409,
    message: "Réponse provider ambigüe — rapprocher sans rejouer l'opération",
  },
  BENEFICIARY_UNVERIFIED: {
    code: "FAILED_PRECONDITION",
    status: 422,
    message: "Bénéficiaire non vérifié pour le payout",
  },
} as const;

export type PaymentErrorCode = keyof typeof PAYMENT_ERRORS;
export type PaymentErrorInfo = (typeof PAYMENT_ERRORS)[PaymentErrorCode];

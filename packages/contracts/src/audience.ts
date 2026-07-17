/**
 * Audience field projection policy for contract consumers.
 * Transport adapters must filter views using these deny-lists before serialize.
 * SEQ-01 freeze — do not invent product fields here; only enforce documented no-leak rules.
 */

export type AudienceRole = "player" | "observer" | "admin" | "system" | "support" | "finance";

/** Fields that must never appear in any public network projection. */
export const GLOBAL_FORBIDDEN_FIELDS = [
  "password",
  "password_hash",
  "token_hash",
  "internal_token",
  "secret",
  "api_key",
  "apiuser",
  "apikey",
  "provider_secret",
  "raw_provider_payload",
  "cached_answer",
  "correct_answer",
  "cached_choice",
  "hidden_role",
  "other_roles",
  "full_answer_sequence",
] as const;

/** Provisional scoring is admin/system review only (sprint 13 AC-13-01, AC-13-06). */
export const PLAYER_FORBIDDEN_FIELDS = [
  ...GLOBAL_FORBIDDEN_FIELDS,
  "provisional_score",
  "provisional_scores",
  "raw_score",
  "evidence_hash",
  "score_evidence",
  "private_payload",
  "MiniGamePrivateState",
  "list_provisional_scores",
  "partner_choice_id",
  "role_id",
  "own_role_id",
  "server_signal_at_ms",
] as const;

export const OBSERVER_FORBIDDEN_FIELDS = [
  ...PLAYER_FORBIDDEN_FIELDS,
  "connection_token",
  "session_token",
  "wallet_balance",
  "ledger",
  "payment_provider_external_id",
  "risk_signal_detail",
  "redacted_detail",
  "own_choice_id",
  "private_hint",
] as const;

/** Support is read-only on competition commands (sprint 18). */
export const SUPPORT_FORBIDDEN_FIELDS = [
  ...GLOBAL_FORBIDDEN_FIELDS,
  "connection_token",
  "session_token",
  "correct_answer",
  "cached_answer",
  "cached_choice",
  "own_role_id",
  "other_roles",
  "full_answer_sequence",
] as const;

export const AUDIENCE_FORBIDDEN: Record<AudienceRole, readonly string[]> = {
  player: PLAYER_FORBIDDEN_FIELDS,
  observer: OBSERVER_FORBIDDEN_FIELDS,
  admin: GLOBAL_FORBIDDEN_FIELDS,
  system: GLOBAL_FORBIDDEN_FIELDS,
  support: SUPPORT_FORBIDDEN_FIELDS,
  finance: [...GLOBAL_FORBIDDEN_FIELDS, "connection_token", "session_token", "correct_answer"],
};

/**
 * Returns forbidden field names found in a plain object tree for the given audience.
 */
export function findForbiddenFields(
  value: unknown,
  audience: AudienceRole,
  path = "",
): string[] {
  const forbidden = new Set(AUDIENCE_FORBIDDEN[audience].map((f) => f.toLowerCase()));
  const hits: string[] = [];

  const walk = (node: unknown, current: string) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${current}[${index}]`));
      return;
    }
    if (typeof node !== "object") return;

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      const next = current ? `${current}.${key}` : key;
      if (forbidden.has(key.toLowerCase())) {
        hits.push(next);
      }
      walk(child, next);
    }
  };

  walk(value, path);
  return hits;
}

export function assertAudienceSafe(value: unknown, audience: AudienceRole): void {
  const hits = findForbiddenFields(value, audience);
  if (hits.length > 0) {
    throw new Error(`Audience ${audience} projection leaks forbidden fields: ${hits.join(", ")}`);
  }
}

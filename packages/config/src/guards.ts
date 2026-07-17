/**
 * Mechanical no-mock / no-local-fallback detectors for strict deploy environments.
 * Used by the env validator and by CI source/artifact scanners.
 */

export const FORBIDDEN_PRODUCTION_SUBSTRINGS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "fapshi-local",
  "*-local-*", // pattern marker for scanners; also check regex below
  "SeedPass123!",
  "seed-admin-session-token",
  "seed-player1-session-token",
  "your_sandbox_api_user_here",
  "your_sandbox_api_key_here",
  "your_webhook_secret_here",
  "FakeNotificationProvider",
  "PROVIDER_SDK_NOT_WIRED",
] as const;

const LOCAL_HOST_RE = /(?:^|\/\/|@)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i;
const LOCAL_ID_RE = /\b[\w-]*-local-[\w-]*\b/i;
const FAPSHI_LOCAL_RE = /fapshi-local/i;
const SEED_CREDENTIAL_RE = /SeedPass123!|seed-admin-session-token|seed-player1-session-token/i;
const PLACEHOLDER_SECRET_RE =
  /your_sandbox_api_(?:user|key)_here|your_webhook_secret_here|changeme|replace_me/i;
const FAKE_PROVIDER_RE = /FakeNotificationProvider|fake-provider|provider_sdk_not_wired/i;

export type GuardHit = {
  rule: string;
  value: string;
  field?: string;
};

/**
 * Returns hits for values that must never appear in staging/production config or binaries.
 */
export function findForbiddenDeployValue(value: string, field?: string): GuardHit[] {
  if (!value) return [];
  const hits: GuardHit[] = [];
  const check = (rule: string, re: RegExp) => {
    if (re.test(value)) hits.push({ rule, value: summarize(value), field });
  };
  check("localhost_or_loopback", LOCAL_HOST_RE);
  check("local_id_pattern", LOCAL_ID_RE);
  check("fapshi_local", FAPSHI_LOCAL_RE);
  check("seed_credential", SEED_CREDENTIAL_RE);
  check("placeholder_secret", PLACEHOLDER_SECRET_RE);
  check("fake_provider", FAKE_PROVIDER_RE);
  return hits;
}

function summarize(value: string): string {
  if (value.length <= 80) return value;
  return `${value.slice(0, 40)}…${value.slice(-20)}`;
}

/**
 * Scan free text (source or build artifact) for production-forbidden markers.
 * Skips comments that only document the ban when `allowDocMentions` is true is NOT used —
 * scanners should target built JS and selected runtime sources.
 */
export function scanTextForProductionLeaks(text: string, source = "artifact"): GuardHit[] {
  const hits: GuardHit[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore pure documentation lines in markdown.
    if (source.endsWith(".md")) continue;
    const lineHits = findForbiddenDeployValue(line, `${source}:${i + 1}`);
    hits.push(...lineHits);
  }
  return hits;
}

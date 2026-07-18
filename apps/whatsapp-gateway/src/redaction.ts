const SECRET_KEY =
  /(?:password|passwd|secret|token|api[_-]?key|authorization|bearer|cookie|session)/i;
const PHONE_LIKE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL_LIKE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Mask a phone-like string for logs (keep last 2 digits).
 */
export function redactPhone(value: string): string {
  if (value.length <= 2) return "**";
  return `${"*".repeat(Math.max(0, value.length - 2))}${value.slice(-2)}`;
}

/**
 * Redact secrets, bearer tokens, emails and phone-like substrings from free text.
 */
export function redactText(input: string): string {
  return input
    .replace(BEARER, "Bearer ***")
    .replace(PHONE_LIKE, (m) => redactPhone(m.replace(/\s+/g, "")))
    .replace(EMAIL_LIKE, "***@***")
    .replace(
      /(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^"',\s}]+/gi,
      "$1=***",
    );
}

/**
 * Produce a log-safe shallow view of an object (drops secret-looking keys, redacts strings).
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactForLog(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) {
        out[k] = "***";
      } else {
        out[k] = redactForLog(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

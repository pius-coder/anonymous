# Examine

## Review Notes
- Risk-sensitive hashes are redacted in session risk responses.
- Admin risk/compliance/moderation endpoints require privileged roles.
- Support dispute creation is authenticated and rate limited.
- Internal anti-cheat signal ingestion requires the internal API key.
- Publication and chance-dominant mini-game checks fail closed when compliance gates are active.
- Payment and wallet mutation routes now have coarse per-IP rate limiting.

## Findings
- No blocking findings after validation.
- The untracked `session-ses_0bfa.md` file is unrelated session context and intentionally left out of the feature staging set.

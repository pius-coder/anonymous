# Step 02: Plan

**Task:** setup localhost/custom LAN IP dev access, fix mobile hamburger interaction, align public UI colors with Squid Game globals
**Started:** 2026-07-09T13:56:29Z

---

## Planning Progress

_Implementation plan will be written here..._

## Plan

- `apps/web/next.config.ts`: keep `/api/v1` rewrite to `API_URL`, add env-driven `allowedDevOrigins` for phone/LAN dev HMR.
- `apps/web/package.json`: bind Next dev to `0.0.0.0` while preserving port `3000`.
- `.env.example` and `.env`: document/set `API_URL`, `LAN_IP`, `NEXT_DEV_ALLOWED_HOST`, `NEXT_ALLOWED_DEV_ORIGINS`, `GAME_WS_URL`.
- `apps/web/src/components/game/public-header.tsx`: replace implicit mobile Sheet hamburger with explicit React state, `aria-expanded`, `Menu`/`X`, and a visible mobile nav panel.
- `apps/web/src/app/globals.css`: lock dark Squid Game background on `html` and `body` with `color-scheme: dark`.
- `apps/web/src/__tests__/index.test.ts`: assert the dev script keeps LAN binding and port.

## Acceptance Criteria

- LAN/mobile URL such as `http://10.249.227.99:3000` can be allowed through env-backed Next dev origin config.
- API calls remain same-origin through `/api/v1` rewrite to `API_URL`.
- Hamburger tap changes UI state immediately on mobile.
- Public UI uses the dark Squid Game tokens instead of the cream/yellow default background.

# Step 02: Plan

**Task:** implement profile picture with minidenticons (random params based on username)
**Started:** 2026-07-09T12:26:35Z

---

## Implementation Plan

### Overview
Install `minidenticons` and create a custom `MinidenticonAvatar` component that auto-generates deterministic SVG identicons from usernames using a custom hash function for varied appearance. Replace manual initial-based fallbacks across the app.

### Prerequisites
- [x] minidenticons library researched (v4.2.1, `minidenticon(seed, saturation?, lightness?, hashFn?)`)
- [x] Existing Avatar component understood (`Avatar` + `AvatarFallback` + `AvatarImage`)
- [x] All avatar usage locations identified

---

### File Changes

#### 1. `apps/web/package.json`
- Add dependency: `"minidenticons": "^4.2.1"`

#### 2. `apps/web/src/components/retroui/avatar.tsx` - NEW: `MinidenticonAvatar` component
- Import `minidenticon` from `minidenticons`
- Import `useMemo` from `react`
- New component `MinidenticonAvatar`:
  - Props: `seed: string`, `saturation?: number`, `lightness?: number`, `size?: "default" | "sm" | "lg"`, `className?: string`
  - Uses a **custom hash function** that derives "rambon" params from seed
  - The custom hashFn modifies the hash based on character positions to generate unique visual params per user
  - Generates SVG data URI via `useMemo`
  - Renders `<img>` with data URI inside the Avatar component (standard React pattern)

#### 3. `apps/web/src/components/game/public-header.tsx`
- At line 77-82: Replace AvatarFallback initials with `<MinidenticonAvatar seed={user.username ?? user.email} />`

#### 4. `apps/web/src/app/(client)/me/page.tsx`
- At lines 177-183: Replace Avatar + AvatarFallback pattern with MinidenticonAvatar when no avatarUrl
- Keep AvatarImage for when avatarUrl IS set

---

### Testing Strategy
- No new test files needed (UI component swap, visual change)
- Existing e2e tests should still pass

### Acceptance Criteria Mapping
- [ ] AC1: Identicon generated deterministically from username → MinidenticonAvatar
- [ ] AC2: Custom "rambon" params produce varied identicons → custom hashFn
- [ ] AC3: Identicon shows when no avatarUrl is set → fallback in header + profile

---

## Step Complete
**Status:** ✓ Complete
**Files planned:** 4 files
**Next:** step-03-execute.md

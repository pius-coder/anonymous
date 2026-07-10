# Step 01: Analyze

**Task:** implement profile picture with minidenticons (random params based on username)
**Started:** 2026-07-09T12:26:35Z

---

## Context Discovery

### Codebase Context

**Prisma Schema (`packages/db/prisma/schema.prisma:239`):**
- `User.avatarUrl String?` - nullable string for external avatar URL on User model
- `PlayerProfile.avatarUrl String?` - same on PlayerProfile model (line 290)

**Avatar Components (`apps/web/src/components/retroui/avatar.tsx`):**
- `Avatar`, `AvatarImage`, `AvatarFallback` components from `@base-ui/react/avatar`
- Avatar has `size` prop: `"default" | "sm" | "lg"` (size-8 / lg:size-10 / sm:size-6)
- AvatarFallback shows initials currently

**Places avatars are displayed:**
1. `public-header.tsx:78` - User dropdown menu avatar (initials fallback)
   - `(user.name ?? user.username ?? user.email).slice(0, 2).toUpperCase()`
2. `me/page.tsx:177-183` - Profile page avatar (initials fallback + avatarUrl optional)
   - Shows AvatarImage if profile.avatarUrl exists, otherwise AvatarFallback initials
3. `admin-shell.tsx:33` - Admin layout avatar display

**User session data (`apps/web/src/lib/useSession.ts`):**
- `SessionUser` type has: id, email, name, username?, role
- Available via `useSession()` hook providing `{ user, loading, ... }`

**Current avatar flow:**
- No identicon/mintdenticon lib installed
- Users can manually set avatarUrl in profile settings
- Fallback shows 2-letter initials (e.g., "JD" for John Doe)
- There is no automatic avatar generation based on username

### Library: minidenticons

**Package:** `minidenticons` (latest v4.2.1)
**Author:** Laurent Payot
**API:**
```typescript
minidenticon(seed: string, saturation?: number|string, lightness?: number|string, hashFn?: (str: string) => number): string
```
- Returns SVG string deterministically from seed string
- Default saturation: 95, default lightness: 45
- Same seed always = same identicon
- Custom hashFn allows overriding the pseudo-random generation with own params
- React pattern: useMemo + data URI:
  ```jsx
  const svgURI = useMemo(
    () => 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(username, saturation, lightness)),
    [username, saturation, lightness]
  )
  ```

### Key Insight: "rambon generated with random params based on the user name"

The user wants:
1. Install `minidenticons` package
2. Use the `minidenticon()` function with a **custom hash function** that introduces randomization parameters ("rambon") derived from the username
3. Display the generated SVG identicon as the profile picture (avatar fallback) whenever no avatarUrl is set
4. The custom hash function should produce varied, aesthetically pleasing identicons using different saturation/lightness values based on the username

### Files to Modify
1. `apps/web/package.json` - Add `minidenticons` dependency
2. `apps/web/src/components/retroui/avatar.tsx` or new component - Create `MinidenticonAvatar` component
3. `apps/web/src/components/game/public-header.tsx` - Use new component in user dropdown
4. `apps/web/src/app/(client)/me/page.tsx` - Use new component in profile page
5. `apps/web/src/components/auth/AuthDrawer.tsx` - Check if avatar shown in auth drawer

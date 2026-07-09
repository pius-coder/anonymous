# Agent 08 Report - Next.js App Router Documentation

**Date:** 2026-07-09  
**Library ID:** `/vercel/next.js`  
**Version in repo:** `16.2.10` (`apps/web/package.json:30`)  
**Source:** Context7 fetched from `/vercel/next.js` canary docs  

---

## 1. Library ID Used

- Primary: `/vercel/next.js` (Benchmark: 86.16, Source Reputation: High, Snippets: 6118)
- Secondary reference: `/llmstxt/nextjs_llms-full_txt` (Snippets: 40721)

---

## 2. Current APIs and Conventions Found

### Pages (file-system routing)

A `page.tsx` file at any route segment defines the publicly accessible page component. It must be a default export:

```tsx
// app/page.tsx -> /
// app/admin/page.tsx -> /admin
// app/admin/sessions/page.tsx -> /admin/sessions
export default function Page() {
  return <h1>Hello Next.js!</h1>
}
```

### Layouts

A `layout.tsx` wraps all child pages and nested layouts. The root layout must contain `<html>` and `<body>` tags. Nested layouts do not need these tags:

```tsx
// app/layout.tsx (root - must have html + body)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

// app/admin/layout.tsx (nested - no html/body)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>
}
```

### Component hierarchy (rendering order)

For a given route, components nest recursively: `layout.js` → `template.js` → `error.js` → `loading.js` → `not-found.js` → `page.js` (or nested `layout.js`). Each segment's special files are nested inside parents'.

### Route Groups

Route groups are created by wrapping a folder in parentheses `(folderName)`. The folder is omitted from the URL path. Use cases in this repo:

- `app/(marketing)/page.tsx` → `/` (organizational only)
- `app/(auth)/login/page.tsx` → `/login`

**Key capability:** Route groups can opt specific segments into a layout while excluding others, allowing multiple layouts at the same URL hierarchy level:

```
app/
  (public)/layout.tsx     → applies to public routes only
    catalogue/page.tsx    → /catalogue
  (admin)/layout.tsx      → applies to admin routes only
    admin/page.tsx        → /admin
```

### Dynamic Route Params (breaking change in Next.js 16)

Route params are now `Promise<T>` and must be awaited:

```tsx
type Params = { params: Promise<{ slug: string }> }

export default async function Page(props: Params) {
  const { slug } = await props.params
  return <div>{slug}</div>
}
```

This applies to `generateMetadata` and any other parameter accessor.

### notFound()

`notFound()` is callable in server components to trigger the nearest `not-found.tsx`:

```tsx
import { notFound } from 'next/navigation'

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const data = await getData(id)
  if (!data) notFound()
  return <div>{data}</div>
}
```

This works in both server components and `generateMetadata`.

### Metadata

Defined via a named `metadata` export (static) or `generateMetadata` function (dynamic):

```tsx
import type { Metadata } from 'next'

// Static
export const metadata: Metadata = {
  title: 'My Page Title',
}

// Dynamic (params are Promise<T> in Next.js 16)
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params
  const post = await getPost(id)
  return { title: post.title }
}

export default function Page() { return '...' }
```

### Server vs Client Components

- **Server Components (default):** All components in `app/` are server components by default. They can be `async`, directly access databases/APIs, and import from server-only modules.
- **Client Components:** Opt-in via `"use client"` directive. Required for interactivity (hooks, event handlers, browser APIs).

### Parallel Routes (`@slot`)

Define parallel route slots with `@folderName` convention. The parent layout receives the slot as a named prop:

```tsx
// app/layout.tsx
export default function Layout({
  children,     // default slot
  team,         // @team parallel route
  analytics,    // @analytics parallel route
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return <>{children}{team}{analytics}</>
}
```

### Intercepting Routes

Convention: `(.)folder` (same level), `(..)folder` (parent), `(..)(..)folder` (two levels up), `(...)folder` (root). Used for modals overlaying the current view.

---

## 3. Version-Specific Gotchas Relevant to This Repo

### Next.js 16.2.10 breaking changes

| Gotcha | Detail |
|---|---|
| **`params` is `Promise<T>`** | `props.params` must be `await`ed. All existing and new admin page components with dynamic routes must use `async` + `await params`. |
| **`searchParams` is `Promise<T>`** | Same pattern — must be awaited. |
| **`cookies()` from `next/headers` is async** | `const cookieStore = await cookies()` — the repo already uses this in `apps/web/src/app/admin/layout.tsx:28`. |

### No route group for admin currently

The admin layout at `apps/web/src/app/admin/layout.tsx` is a direct nested layout under `app/admin/`. Since all admin pages share this layout, route groups are not strictly necessary here but could be used for organizing internal sub-sections with different layouts (e.g., `(sessions)/` and `(operations)/` groups within `admin/`).

### `notFound()` return type

`notFound()` never returns — it throws a `NOT_FOUND` error caught by the nearest `not-found.tsx`. TypeScript may require `return notFound()` or `notFound(); return` to satisfy control flow analysis.

### Layout does not re-render on navigation

Layouts persist across navigations. For admin pages that need to refetch data per-route, use:
- `cache: "no-store"` in `fetch()` (already used in this repo)
- A client component with `useEffect` for real-time data

---

## 4. Examples and Concise Snippets from Docs

### Adding a new admin page (server component pattern)

```tsx
// apps/web/src/app/admin/payments/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Paiements | Admin",
};

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function getPayments() {
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}/v1/admin/payments`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function PaymentsPage() {
  const payments = await getPayments();
  if (!payments) return <div>Erreur chargement</div>;
  return (
    <div className="space-y-6">
      <h1 className="font-head text-3xl">Paiements</h1>
      {/* Data table here */}
    </div>
  );
}
```

### Dynamic admin page with awaited params

```tsx
// apps/web/src/app/admin/users/[id]/page.tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

export default async function UserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}/v1/admin/support/users/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) notFound();
  const json = await res.json();
  const user = json.data.user;
  return <div>{user.email}</div>;
}
```

### `not-found.tsx` for admin sub-section

```tsx
// apps/web/src/app/admin/payments/not-found.tsx
import Link from "next/link";
import { Card } from "@/components/retroui/Card";
import { Button } from "@/components/retroui/Button";

export default function NotFound() {
  return (
    <Card className="p-6 text-center">
      <h2 className="font-head text-xl">Paiement introuvable</h2>
      <p className="text-muted-foreground">Ce paiement n'existe pas ou a été supprimé.</p>
      <Button asChild><Link href="/admin/payments">Retour</Link></Button>
    </Card>
  );
}
```

### Route group for organizing admin sub-sections

```
app/
  admin/
    layout.tsx           ← shared admin shell
    page.tsx             ← /admin
    (sessions)/
      sessions/
        page.tsx         ← /admin/sessions
        [id]/
          page.tsx       ← /admin/sessions/123
    (operations)/
      payments/
        page.tsx         ← /admin/payments
      wallets/
        page.tsx         ← /admin/wallets
    live/
      page.tsx           ← /admin/live
```

This is optional — the current `app/admin/` flat structure works identically. Route groups are only needed if different subsets need different layouts at the same level.

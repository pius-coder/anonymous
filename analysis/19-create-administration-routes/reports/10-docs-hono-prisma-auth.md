# Report 10: Docs Hono Prisma admin contracts

## Context7 Library IDs used

- `/websites/hono_dev` — Hono (benchmark 86.88, code snippets 1199, source High)
- `/prisma/web` — Prisma (benchmark 88.49, code snippets 17561, source High)
  - Prisma docs were NOT fetched (third command used for library lookup only per prompt instructions)
  - **Prisma follow-up fetch required** — via `npx ctx7@latest docs /prisma/web "Prisma Client filtering pagination include transactions TypeScript"` when needed.

## Repo versions (from package.json)

| Package    | Dependency      | Version   |
|------------|-----------------|-----------|
| `apps/api` | `hono`          | `^4.6.0`  |
| `packages/db` | `prisma`     | `^6.0.0`  |

## Current Hono route/middleware/testing APIs (v4.6+)

### JSON Responses
- `c.json(body, status?)` — sets `Content-Type: application/json` automatically.
- `c.jsonT(obj)` — JSON response with type inference (v4).
- Status code as second argument: `c.json({ error: "Forbidden" }, 403)`.

### Middleware & Context Variables
- `createMiddleware<{ Variables: { ... } }>(async (c, next) => { ... })` — injects typed context variables via `c.set('key', value)`, accessible in handlers as `c.var.key`.
- For auth middleware: attach `user` or `role` to `c.var` for type-safe downstream access.

### Route Grouping
- `app.route('/admin', adminRoutes)` — mount sub-routers.
- `new Hono().basePath('/api/v1')` — base path for all routes.

### Route Handler Types
- Hono v4 supports full TypeScript generics on request params, query, and body.
- `c.req.param('id')`, `c.req.query('page')`, `c.req.json()` — typed request helpers.
- `c.req.valid('json')` with Zod validation middleware for typed body parsing.

### Testing
- **Native**: `app.request(path, options)` returns `Response` — works with Vitest, Jest, Deno.
  ```ts
  const res = await app.request('/admin/users', { method: 'GET', headers })
  expect(res.status).toBe(200)
  ```
- **`hono/testing`**: `testClient(app)` — typed RPC-style client.
  ```ts
  const client = testClient(app)
  const res = await client.admin.users.$get({ query: { page: '1' } })
  ```
- JSON body in tests: pass `body: JSON.stringify(...)` with `Content-Type: application/json` header.
- FormData: `new FormData()` body with no extra Content-Type header needed.

### Validation Middleware (recommended pattern)
- `@hono/zod-validator` — use `zValidator('json', schema)` for typed, validated request bodies.
- Combine with `c.req.valid('json')` for inferred types.

### Error Handling
- `app.onError((err, c) => c.json({ error: err.message }, 500))` — global error handler.
- `app.notFound((c) => c.json({ error: "Not Found" }, 404))` — 404 handler.

## Version-specific gotchas for this repo

1. **Hono ^4.6.0**: `c.jsonT()` was added in v4; `testClient` is available from `hono/testing`. Ensure `hono` peer deps satisfy `@hono/zod-validator` if using Zod.
2. **Prisma ^6.0.0**: Prisma v6 dropped some deprecated `findMany` overloads. Use explicit `skip`/`take` for pagination. `include` and `select` are still available. Prisma v6 also changed the transaction API — `$transaction` with interactive API is preferred over the array form for multi-step operations.
3. **Role guard pattern**: Use `createMiddleware` to attach the authenticated user to `c.var`, then a second middleware to check `c.var.user.role` against allowed roles. This keeps route handlers clean.
4. **Prisma follow-up needed**: To design admin CRUD endpoints (filtering, pagination, includes, transactions), run `npx ctx7@latest docs /prisma/web "Prisma Client filtering pagination include transactions TypeScript"`.

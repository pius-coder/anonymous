<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo-specific

- **Package manager**: `bun` (bun.lock present). Use `bun add` / `bun remove` for deps.
- **Commands**: `bun dev` (dev server, Turbopack), `bun run build`, `bun run lint`. No test command — none is configured.
- **Tailwind v4**: uses `@import "tailwindcss"` in CSS (not `@tailwind` directives). Theme tokens use `@theme inline {}` syntax.
- **TypeScript**: strict mode, `@/*` import alias maps to repo root.
- **Router**: App Router only (no pages/ directory).
- **No tests**, no CI, no opencode.json — standard scaffold.

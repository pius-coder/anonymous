# Report 09: Turborepo Dev — `recursive_turbo_invocations` Docs

## 1. Library ID

**`/vercel/turborepo`** — official repo docs, highest benchmark score (90.77), 3159 code snippets, source reputation: High.

## 2. What Causes Recursive Turbo Invocations

A root `package.json` script that calls `turbo run <task>` where a workspace package defines a `scripts.<task>` that also calls `turbo run <task>` creates an infinite loop. The canonical example:

```json
{
  "scripts": {
    "build": "turbo run build"
  }
}
```

Turborepo runs `build` → finds `turbo run build` in the root → invokes workspace `build` scripts → one of those also runs `turbo run build` → recursion.

This is most common in **single-package workspaces** (no monorepo structure) where there is no package-level script separation, but the issue can also arise accidentally when a workspace package's script itself delegates back to `turbo`.

## 3. Current Documented Configuration Guidance

**Root scripts must delegate to `turbo run`** for each task (dev, build, test, lint). Direct commands bypass Turborepo entirely (no caching, no parallelization):

```json
// CORRECT
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}

// WRONG — bypasses turbo
{
  "scripts": {
    "dev": "bun dev",
    "build": "bun build"
  }
}
```

**Avoid recursion by ensuring workspace-level scripts never re-invoke `turbo run`** for the same task name. Package-level scripts should run directly (e.g., `node build.js`, `tsc`, `vite build`) and let `turbo run` orchestrate from the root.

The docs recommend using explicit `turbo run` in root scripts (rather than bare `turbo`) to avoid future collisions with new turbo subcommands.

## 4. Repo-Relevant Gotchas

1. **This repo uses `turbo run dev` from the root** (see root `package.json`). If any package workspace script also called `turbo run dev` instead of its actual dev command, it would trigger the recursion error.
2. **The recursive pattern detection** is built into Turborepo itself — it emits `recursive_turbo_invocations` as a user-facing error message and refuses to continue, rather than silently looping.
3. **Single-package workspaces** are the most common trigger: placing `turbo run dev` as a package script when there are no sub-packages is a no-op loop.
4. **`turbo run` should always be in root scripts only** — package-level scripts should use their actual tooling (e.g., `tsx src/index.ts`, `vite`, `tsc`). If a package genuinely needs to invoke turbo, it must target a **different** task name to avoid recursion.
5. The error is documented at `apps/docs/content/docs/messages/recursive-turbo-invocations.mdx` in the Turborepo repo — indicating it's a known, intentionally handled user-facing error.

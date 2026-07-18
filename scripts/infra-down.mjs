#!/usr/bin/env node
import { resolveWorktreeEnv, infraDown, safeLog } from "./lib/infra.mjs";

const env = resolveWorktreeEnv();
// Preserve backend choice from env if set
env.TEST_INFRA_BACKEND = process.env.TEST_INFRA_BACKEND || env.TEST_INFRA_BACKEND;
infraDown(env);
safeLog("[infra:down] done", env.WORKTREE_ID);

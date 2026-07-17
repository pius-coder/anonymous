import { isStrictDeployEnv, resolveAppEnv, type AppEnv } from "./app-env.js";
import { ENV_VAR_SPECS, type ServiceName } from "./contracts.js";
import { findForbiddenDeployValue, type GuardHit } from "./guards.js";

export type ValidationIssue = {
  code: string;
  message: string;
  field?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  appEnv: AppEnv;
  service: ServiceName;
  issues: ValidationIssue[];
  /** Variable names required for this service/env (no values). */
  requiredVars: string[];
};

export type ValidateOptions = {
  service: ServiceName;
  env?: NodeJS.ProcessEnv;
  /** When true, throw Error with aggregated message. */
  throwOnError?: boolean;
  /** Skip listen-port related checks (unit tests). */
  skipListenGuards?: boolean;
};

const URL_FIELDS = [
  "DATABASE_URL",
  "TEST_DATABASE_URL",
  "REDIS_URL",
  "API_URL",
  "GAME_WS_URL",
  "E2E_BASE_URL",
  "FAPSHI_BASE_URL",
  "NEXT_PUBLIC_LIVE_ENDPOINT",
] as const;

/**
 * Validate environment for a service. Fail-fast ready for process boot.
 * Never includes secret values in issue messages.
 */
export function validateServiceEnv(options: ValidateOptions): ValidationResult {
  const env = options.env ?? process.env;
  const appEnv = resolveAppEnv(env);
  const issues: ValidationIssue[] = [];
  const service = options.service;
  const strict = isStrictDeployEnv(appEnv);

  const required = ENV_VAR_SPECS.filter((spec) => {
    if (service !== "shared" && !spec.services.includes(service)) return false;
    if (spec.requirement === "always") return true;
    if (spec.requirement === "strict") return strict;
    return false;
  });

  for (const spec of required) {
    const value = env[spec.name];
    if (value === undefined || value.trim() === "") {
      issues.push({
        code: "MISSING_REQUIRED",
        field: spec.name,
        severity: "error",
        message: `Missing required variable ${spec.name} for ${service} in APP_ENV=${appEnv}`,
      });
    }
  }

  if (strict) {
    for (const field of URL_FIELDS) {
      const value = env[field];
      if (!value) continue;
      for (const hit of findForbiddenDeployValue(value, field)) {
        issues.push({
          code: hit.rule.toUpperCase(),
          field,
          severity: "error",
          message: `Forbidden ${hit.rule} in ${field} for APP_ENV=${appEnv}`,
        });
      }
    }

    // Seed must not be enabled in production/staging
    if (env.ALLOW_SEED_IN_PRODUCTION === "1" || env.ALLOW_SEED_IN_PRODUCTION === "true") {
      issues.push({
        code: "SEED_FORBIDDEN",
        field: "ALLOW_SEED_IN_PRODUCTION",
        severity: "error",
        message: "Seed credentials must not be enabled in staging/production",
      });
    }

    // Explicit fake provider selection
    const provider = (env.NOTIFICATION_PROVIDER || env.PAYMENT_PROVIDER || "").toLowerCase();
    if (provider === "fake" || provider === "local" || provider === "mock") {
      issues.push({
        code: "FAKE_PROVIDER",
        field: "NOTIFICATION_PROVIDER|PAYMENT_PROVIDER",
        severity: "error",
        message: `Provider "${provider}" is forbidden in APP_ENV=${appEnv}`,
      });
    }

    // NODE_ENV should be production for production deploys
    if (appEnv === "production" && env.NODE_ENV && env.NODE_ENV !== "production") {
      issues.push({
        code: "NODE_ENV_MISMATCH",
        field: "NODE_ENV",
        severity: "error",
        message: "APP_ENV=production requires NODE_ENV=production",
      });
    }
  }

  // Game server: no silent localhost Redis in strict envs
  if (strict && (service === "game-server" || service === "worker" || service === "api")) {
    if (!env.REDIS_URL && !env.REDIS_HOST) {
      issues.push({
        code: "MISSING_REDIS",
        field: "REDIS_URL",
        severity: "error",
        message: `REDIS_URL (or REDIS_HOST) required for ${service} in APP_ENV=${appEnv}`,
      });
    }
  }

  const result: ValidationResult = {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    appEnv,
    service,
    issues,
    requiredVars: required.map((r) => r.name),
  };

  if (!result.ok && options.throwOnError) {
    const msg = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ");
    throw new EnvValidationError(msg, result);
  }

  return result;
}

/**
 * Call before opening a listen socket. Throws EnvValidationError on failure.
 */
export function assertBootEnv(service: ServiceName, env: NodeJS.ProcessEnv = process.env): void {
  // Unit/test harness: soft validation unless APP_ENV is strict.
  const appEnv = resolveAppEnv(env);
  if (appEnv === "test" && env.HARNESS_MODE === "1") {
    return;
  }
  validateServiceEnv({ service, env, throwOnError: true });
}

export class EnvValidationError extends Error {
  readonly result: ValidationResult;

  constructor(message: string, result: ValidationResult) {
    super(message);
    this.name = "EnvValidationError";
    this.result = result;
  }
}

/** Safe report for CI/docs: names only. */
export function formatRequiredVarsReport(appEnv: AppEnv): string {
  const lines = [`# Required environment variables (APP_ENV=${appEnv})`, ""];
  const services: ServiceName[] = ["api", "game-server", "worker", "web", "whatsapp-gateway"];
  for (const service of services) {
    const result = validateServiceEnv({
      service,
      env: { APP_ENV: appEnv, NODE_ENV: appEnv === "production" ? "production" : "development" },
    });
    lines.push(`## ${service}`);
    if (result.requiredVars.length === 0) {
      lines.push("- (no strict required vars for this soft env sample)");
    } else {
      for (const name of result.requiredVars) {
        const spec = ENV_VAR_SPECS.find((s) => s.name === name);
        lines.push(`- \`${name}\`${spec?.secret ? " (secret)" : ""} — ${spec?.description ?? ""}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export type { GuardHit };

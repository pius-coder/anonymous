import type { AppEnv } from "./app-env.js";

export type ServiceName =
  | "api"
  | "game-server"
  | "worker"
  | "web"
  | "whatsapp-gateway"
  | "shared";

/** Variable requirement: always required, or only in strict deploy envs. */
export type VarRequirement = "always" | "strict" | "optional";

export type EnvVarSpec = {
  name: string;
  services: ServiceName[];
  requirement: VarRequirement;
  /** When true, value is redacted in reports. */
  secret?: boolean;
  description: string;
};

/**
 * Public contract of environment variables (names + rules only — never values in reports).
 */
export const ENV_VAR_SPECS: EnvVarSpec[] = [
  {
    name: "APP_ENV",
    services: ["api", "game-server", "worker", "web", "whatsapp-gateway"],
    requirement: "optional",
    description: "Deployment environment: local | test | staging | production",
  },
  {
    name: "NODE_ENV",
    services: ["api", "game-server", "worker", "web", "whatsapp-gateway"],
    requirement: "optional",
    description: "Node runtime mode (development | test | production)",
  },
  {
    name: "DATABASE_URL",
    services: ["api", "worker", "game-server"],
    requirement: "strict",
    secret: true,
    description: "PostgreSQL connection string",
  },
  {
    name: "REDIS_URL",
    services: ["api", "game-server", "worker"],
    requirement: "strict",
    secret: true,
    description: "Redis URL for queues and live presence",
  },
  {
    name: "API_URL",
    services: ["web", "api"],
    requirement: "strict",
    description: "Public or internal API base URL",
  },
  {
    name: "GAME_WS_URL",
    services: ["web", "api", "game-server"],
    requirement: "strict",
    description: "Colyseus / live WebSocket URL returned to clients",
  },
  {
    name: "PORT",
    services: ["api"],
    requirement: "optional",
    description: "API listen port",
  },
  {
    name: "GAME_SERVER_PORT",
    services: ["game-server"],
    requirement: "optional",
    description: "Game server listen port",
  },
  {
    name: "FAPSHI_BASE_URL",
    services: ["api", "worker"],
    requirement: "strict",
    description: "Fapshi API base (sandbox or live host — never local fake)",
  },
  {
    name: "FAPSHI_API_USER",
    services: ["api", "worker"],
    requirement: "strict",
    secret: true,
    description: "Fapshi apiuser header (never client-exposed)",
  },
  {
    name: "FAPSHI_API_KEY",
    services: ["api", "worker"],
    requirement: "strict",
    secret: true,
    description: "Fapshi apikey header (never client-exposed)",
  },
  {
    name: "FAPSHI_WEBHOOK_SECRET",
    services: ["api"],
    requirement: "strict",
    secret: true,
    description: "Webhook verification secret",
  },
  {
    name: "FAPSHI_ENV",
    services: ["api", "worker"],
    requirement: "optional",
    description: "sandbox | live",
  },
  {
    name: "ALLOW_SEED_IN_PRODUCTION",
    services: ["api", "worker", "web"],
    requirement: "optional",
    description: "Must never be 1 in production (seed credentials banned)",
  },
];

export function requiredVarsFor(
  service: ServiceName,
  appEnv: AppEnv,
): EnvVarSpec[] {
  const strict = appEnv === "staging" || appEnv === "production";
  return ENV_VAR_SPECS.filter((spec) => {
    if (!spec.services.includes(service) && service !== "shared") return false;
    if (spec.requirement === "always") return true;
    if (spec.requirement === "strict") return strict;
    return false;
  });
}

/** Names only — safe to log. */
export function listRequiredVarNames(service: ServiceName, appEnv: AppEnv): string[] {
  return requiredVarsFor(service, appEnv).map((s) => s.name);
}

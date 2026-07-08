export type ReleaseGateStatus = "pass" | "manual" | "blocked";

export interface DocumentationGate {
  readonly technology: string;
  readonly installedVersion: string;
  readonly source: "context7" | "official-docs";
  readonly reference: string;
  readonly status: ReleaseGateStatus;
  readonly note: string;
}

export interface RecetteJourney {
  readonly id: string;
  readonly name: string;
  readonly requiredEvidence: readonly string[];
  readonly automatedEvidence: readonly string[];
  readonly manualEvidence: readonly string[];
  readonly status: ReleaseGateStatus;
}

export interface PreLaunchGate {
  readonly id: string;
  readonly label: string;
  readonly status: ReleaseGateStatus;
  readonly blocksLiveLaunch: boolean;
  readonly note: string;
}

export interface ReleaseDecision {
  readonly controlledSandbox: "go" | "no-go";
  readonly liveProduction: "go" | "no-go";
  readonly blockers: readonly string[];
}

export const RELEASE_RECETTE_VERSION = "2026-07-08-feature-16";

export const DOCUMENTATION_GATES = [
  {
    technology: "Hono",
    installedVersion: "4.12.28",
    source: "context7",
    reference: "/websites/hono_dev",
    status: "pass",
    note: "Middleware, routing, body limit, secure headers, and auth patterns verified.",
  },
  {
    technology: "Next.js",
    installedVersion: "16.2.10",
    source: "context7",
    reference: "/vercel/next.js/v16.2.9",
    status: "pass",
    note: "App Router build, async request APIs, and server-only data handling verified.",
  },
  {
    technology: "Prisma",
    installedVersion: "6.19.3",
    source: "context7",
    reference: "/prisma/web",
    status: "pass",
    note: "Schema validation, migrations, generated client, and transactions verified.",
  },
  {
    technology: "Colyseus",
    installedVersion: "0.17.10",
    source: "context7",
    reference: "/colyseus/colyseus",
    status: "pass",
    note: "Room definition, Room APIs, schema state, and simulation timer APIs verified.",
  },
  {
    technology: "BullMQ",
    installedVersion: "5.79.3",
    source: "context7",
    reference: "/websites/bullmq_io",
    status: "pass",
    note: "Workers, retries, delayed jobs, and queue operations verified.",
  },
  {
    technology: "Redis",
    installedVersion: "7-alpine compose image / ioredis 5.10.1",
    source: "context7",
    reference: "/redis/docs",
    status: "pass",
    note: "Persistence and production durability expectations verified.",
  },
  {
    technology: "Docker Compose",
    installedVersion: "compose file format 3.8",
    source: "context7",
    reference: "/docker/compose",
    status: "pass",
    note: "Healthchecks, depends_on semantics, env precedence, and wait behavior verified.",
  },
  {
    technology: "Fapshi",
    installedVersion: "HTTP API",
    source: "official-docs",
    reference: "https://docs.fapshi.com/llms.txt",
    status: "pass",
    note: "Sandbox/live separation, apiuser/apikey auth, webhook secret, and payment link rules verified.",
  },
  {
    technology: "WhatsApp Cloud API",
    installedVersion: "Graph API v23 docs",
    source: "context7",
    reference: "/websites/developers_facebook_business-messaging_whatsapp_v4",
    status: "pass",
    note: "Webhook payload shape and message send contract verified.",
  },
] as const satisfies readonly DocumentationGate[];

export const RECETTE_JOURNEYS = [
  {
    id: "discovery-registration",
    name: "Decouverte et inscription",
    requiredEvidence: ["landing", "catalogue", "session detail", "account creation", "registration pending"],
    automatedEvidence: [
      "apps/web/e2e/feature-01-catalogue-public.spec.ts",
      "apps/api/src/routes/__tests__/auth.test.ts",
      "apps/api/src/routes/__tests__/registrations.test.ts",
    ],
    manualEvidence: ["Run browser E2E against seeded environment before production release."],
    status: "manual",
  },
  {
    id: "payment-lobby",
    name: "Paiement et lobby",
    requiredEvidence: ["Fapshi sandbox", "webhook SUCCESS", "PAID registration", "lobby", "check-in", "join token"],
    automatedEvidence: [
      "apps/api/src/routes/__tests__/payments.test.ts",
      "apps/api/src/routes/__tests__/lobby.test.ts",
      "apps/api/src/lobby/__tests__/lobby.test.ts",
      "apps/worker/src/__tests__/paymentReconciliation.test.ts",
    ],
    manualEvidence: ["Run Fapshi sandbox happy path with configured sandbox credentials."],
    status: "manual",
  },
  {
    id: "live-resolution",
    name: "Live et resolution",
    requiredEvidence: ["admin start", "room join", "round start", "actions", "deadline", "resolution"],
    automatedEvidence: [
      "apps/api/src/routes/__tests__/live.test.ts",
      "apps/api/src/rounds/__tests__/roundResolution.test.ts",
      "apps/game-server/src/live/__tests__/sessionStore.test.ts",
      "apps/worker/src/__tests__/roundDeadline.test.ts",
    ],
    manualEvidence: ["Run two-client live smoke test before production release."],
    status: "manual",
  },
  {
    id: "results-credits",
    name: "Resultats et credits",
    requiredEvidence: ["session finished", "finalize", "winners", "credit distribution", "wallet ledger", "published results"],
    automatedEvidence: [
      "apps/api/src/routes/__tests__/admin-results.test.ts",
      "apps/api/src/results/__tests__/results.test.ts",
      "apps/worker/src/__tests__/creditsDistribution.test.ts",
      "apps/api/src/routes/__tests__/wallet.test.ts",
    ],
    manualEvidence: ["Run ledger balance review on seeded recette data."],
    status: "manual",
  },
  {
    id: "support-audit",
    name: "Support et audit",
    requiredEvidence: ["support search", "finance payment view", "audit view", "dispute", "round replay"],
    automatedEvidence: [
      "apps/api/src/routes/__tests__/admin-operations.test.ts",
      "apps/api/src/routes/__tests__/admin-payments.test.ts",
      "apps/api/src/routes/__tests__/admin-security.test.ts",
      "apps/api/src/routes/__tests__/security.test.ts",
    ],
    manualEvidence: ["Run support operator demo with non-admin and admin accounts."],
    status: "manual",
  },
] as const satisfies readonly RecetteJourney[];

export const PRE_LAUNCH_GATES = [
  {
    id: "production-environment",
    label: "Production environment configured",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Infrastructure values must be verified outside the repository.",
  },
  {
    id: "secret-separation",
    label: "Production secrets separated from sandbox secrets",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Repository only contains placeholders; live secret storage must be verified in deployment.",
  },
  {
    id: "fapshi-live",
    label: "Fapshi live account and IP whitelist validated",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Sandbox integration is ready; live credentials and whitelisting require provider dashboard validation.",
  },
  {
    id: "postgres-backups",
    label: "PostgreSQL backups enabled",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Backup policy depends on production database provider.",
  },
  {
    id: "monitoring-alerts",
    label: "Monitoring and alerts enabled",
    status: "manual",
    blocksLiveLaunch: true,
    note: "RequestId and audit foundations exist; external alerting must be configured.",
  },
  {
    id: "privacy-terms",
    label: "Privacy policy and terms ready",
    status: "blocked",
    blocksLiveLaunch: true,
    note: "Legal/product documents are not present in the repository.",
  },
  {
    id: "legal-opinion-or-limited-launch",
    label: "Legal opinion or launch limited without cash-out",
    status: "pass",
    blocksLiveLaunch: false,
    note: "V1 blocks cash-out and uses internal credits; public/live launch still needs legal approval.",
  },
  {
    id: "support-incident-plan",
    label: "Support incident plan ready",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Support APIs exist; staffing/escalation plan must be approved operationally.",
  },
  {
    id: "rollback-plan",
    label: "Rollback plan documented",
    status: "manual",
    blocksLiveLaunch: true,
    note: "Deployment-specific rollback steps must be recorded by operations.",
  },
] as const satisfies readonly PreLaunchGate[];

export function evaluateReleaseReadiness(): ReleaseDecision {
  const preLaunchGates: readonly PreLaunchGate[] = PRE_LAUNCH_GATES;
  const blockers = preLaunchGates.filter(
    (gate) => gate.blocksLiveLaunch && gate.status !== "pass",
  ).map((gate) => gate.id);

  const docsPass = DOCUMENTATION_GATES.every((gate) => gate.status === "pass");

  return {
    controlledSandbox: docsPass ? "go" : "no-go",
    liveProduction: blockers.length === 0 && docsPass ? "go" : "no-go",
    blockers,
  };
}

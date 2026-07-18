import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function resolveApiUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  // Deployment env only — never treat NODE_ENV=production (next build) as APP_ENV=production.
  const appEnv = (process.env.APP_ENV || "local").toLowerCase();
  if (appEnv === "production" || appEnv === "staging" || appEnv === "prod") {
    throw new Error("API_URL is required in staging/production (no localhost default)");
  }
  return "http://localhost:3001";
}

const apiUrl = resolveApiUrl();

function getLanOrigins() {
  try {
    return Object.values(networkInterfaces())
      .flatMap((interfaces) => interfaces ?? [])
      .filter((entry) => entry.family === "IPv4" && !entry.internal)
      .map((entry) => entry.address);
  } catch {
    return [];
  }
}

function normalizeDevOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    return url.hostname;
  } catch {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split(":")[0]
      .trim();
  }
}

const allowedDevOrigins = Array.from(
  new Set(
    [
      process.env.NEXT_DEV_ALLOWED_HOST,
      process.env.LAN_IP,
      ...(process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "").split(/[,\s]+/),
      ...getLanOrigins(),
    ]
      .map((origin) => (origin ? normalizeDevOrigin(origin) : null))
      .filter((origin): origin is string => Boolean(origin)),
  ),
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: `${apiUrl}/health`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/v1/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

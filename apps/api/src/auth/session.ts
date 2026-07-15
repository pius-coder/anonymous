import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { hashOpaqueToken } from "@session-jeu/shared";

const TOKEN_BYTES = 32;
const COOKIE_NAME_PROD = "__Host-session";
const COOKIE_NAME_DEV = "__session";

export function createOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export { hashOpaqueToken };

export function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function getUserAgent(c: Context): string | undefined {
  return c.req.header("user-agent");
}

function isSecure(c: Context): boolean {
  const allowInsecure = c.req.header("x-forwarded-proto") === "http" ||
    process.env.ALLOW_INSECURE_AUTH_COOKIE === "true";
  return !allowInsecure;
}

function cookieName(c: Context): string {
  return isSecure(c) ? COOKIE_NAME_PROD : COOKIE_NAME_DEV;
}

export function setSessionCookieValue(c: Context, token: string, expiresAt: Date): string {
  const name = cookieName(c);
  const secure = isSecure(c);
  return `${name}=${token}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookieValue(c: Context): string {
  const name = cookieName(c);
  return `${name}=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readSessionCookie(c: Context): string | undefined {
  const name = cookieName(c);
  const cookie = c.req.header("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

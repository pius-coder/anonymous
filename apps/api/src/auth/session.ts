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

export function isSecureRequest(forwardedProto?: string): boolean {
  const allowInsecure = forwardedProto === "http" ||
    process.env.ALLOW_INSECURE_AUTH_COOKIE === "true";
  return !allowInsecure;
}

export function sessionCookieName(forwardedProto?: string): string {
  return isSecureRequest(forwardedProto) ? COOKIE_NAME_PROD : COOKIE_NAME_DEV;
}

export function createSessionCookieValue(
  token: string,
  expiresAt: Date,
  forwardedProto?: string,
): string {
  const name = sessionCookieName(forwardedProto);
  const secure = isSecureRequest(forwardedProto);
  return `${name}=${token}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}; Expires=${expiresAt.toUTCString()}`;
}

export function createClearSessionCookieValue(forwardedProto?: string): string {
  const name = sessionCookieName(forwardedProto);
  const secure = isSecureRequest(forwardedProto);
  return `${name}=; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readSessionCookieHeader(
  cookieHeader: string | undefined,
  forwardedProto?: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const name = sessionCookieName(forwardedProto);
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export function setSessionCookieValue(c: Context, token: string, expiresAt: Date): string {
  return createSessionCookieValue(token, expiresAt, c.req.header("x-forwarded-proto"));
}

export function clearSessionCookieValue(c: Context): string {
  return createClearSessionCookieValue(c.req.header("x-forwarded-proto"));
}

export function readSessionCookie(c: Context): string | undefined {
  return readSessionCookieHeader(
    c.req.header("cookie"),
    c.req.header("x-forwarded-proto"),
  );
}

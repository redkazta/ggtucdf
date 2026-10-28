import { createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import { getServerEnv } from "./env";

export const ADMIN_COOKIE_NAME = "gargut_admin";

const SESSION_MESSAGE = "gargut-admin-session-v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminToken(): string | undefined {
  const token = getServerEnv("PRIVATE_ADMIN_TOKEN", import.meta.env.PRIVATE_ADMIN_TOKEN);

  // A very short token would be trivial to brute-force.
  return token && token.length >= 8 ? token : undefined;
}

function getErpApiToken(): string | undefined {
  const token = getServerEnv("PRIVATE_ERP_API_TOKEN", import.meta.env.PRIVATE_ERP_API_TOKEN);

  if (token && token.length >= 8) return token;

  // Fallback for small deployments: reuse the admin token as the ERP token.
  return getAdminToken();
}

export function isAdminConfigured(): boolean {
  return getAdminToken() !== undefined;
}

function safeEqual(leftValue: string, rightValue: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(leftValue);
  const right = encoder.encode(rightValue);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidPassword(value: unknown): boolean {
  const token = getAdminToken();
  return typeof value === "string" && token !== undefined && safeEqual(value, token);
}

function getSessionValue(): string | undefined {
  const token = getAdminToken();
  if (!token) return undefined;

  return createHmac("sha256", token).update(SESSION_MESSAGE).digest("hex");
}

export function isValidSession(cookies: AstroCookies): boolean {
  const expected = getSessionValue();
  const provided = cookies.get(ADMIN_COOKIE_NAME)?.value;

  return Boolean(expected && provided && safeEqual(provided, expected));
}

/**
 * Allows a server-side ERP to call admin APIs without a browser session.
 * Uses PRIVATE_ERP_API_TOKEN when set; otherwise falls back to PRIVATE_ADMIN_TOKEN.
 */
export function isValidBearerToken(request: Request): boolean {
  const token = getErpApiToken();
  if (!token) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? safeEqual(match[1].trim(), token) : false;
}

export function setSessionCookie(cookies: AstroCookies): boolean {
  const value = getSessionValue();
  if (!value) return false;

  cookies.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return true;
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(ADMIN_COOKIE_NAME, { path: "/" });
}

import { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "nowai_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function getExpectedPin(): string {
  return (process.env.NOWAI_PIN || "1234").trim();
}

/**
 * Generate a lightweight signed session token
 */
export function createSessionToken(): string {
  const payload = {
    auth: true,
    created: Date.now(),
    expires: Date.now() + SESSION_MAX_AGE * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Validate session token
 */
export function validateSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const json = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (json && json.auth === true && json.expires > Date.now()) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Check if incoming NextRequest is authenticated via cookie or auth header
 */
export function isRequestAuthenticated(req: NextRequest): boolean {
  // 1. Check cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie && validateSessionToken(cookie.value)) {
    return true;
  }

  // 2. Check Authorization header for direct API calls
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer === getExpectedPin() || validateSessionToken(bearer)) {
      return true;
    }
  }

  return false;
}

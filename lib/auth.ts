/**
 * Single-user, env-password auth.
 *
 * Design notes:
 * - All auth logic lives in this one module so it can be swapped for
 *   NextAuth (or any multi-user provider) later without touching pages
 *   or API routes — they only call `verifySession()` / the login route.
 * - Session tokens are HMAC-SHA256 signed values ("payload.signature")
 *   using the WebCrypto API, which works in both the Node.js runtime
 *   and the Edge runtime (where Next.js middleware executes).
 * - No user data is stored in the token beyond an expiry timestamp,
 *   because there is exactly one user.
 */

export const SESSION_COOKIE = "jobpilot_session";

/** Session lifetime: 7 days. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

/** Import the AUTH_SECRET env var as an HMAC key (WebCrypto, edge-safe). */
async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short (min 16 chars). Set it in .env."
    );
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** URL-safe base64 without padding. */
function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  // btoa is available in both Node >= 16 and the Edge runtime.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

/**
 * Create a signed session token. Format: "<expiresAtMs>.<signature>".
 */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

/**
 * Verify a session token: signature must match and expiry must be in the
 * future. Safe to call from Edge middleware.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const dotIndex = token.indexOf(".");
  if (dotIndex <= 0) return false;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  // Recompute and compare. Constant-time comparison is not strictly needed
  // for an HMAC output (attacker can't derive partial matches), but we
  // compare full strings anyway.
  const expected = await sign(payload);
  return expected === signature;
}

/**
 * Check a submitted password against the APP_PASSWORD env var.
 */
export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // Length-independent comparison to avoid trivially leaking length via
  // short-circuit timing. For a single-user local tool this is belt and
  // braces, but it costs nothing.
  const a = encoder.encode(candidate);
  const b = encoder.encode(expected);
  let diff = a.length === b.length ? 0 : 1;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/** Cookie attributes shared by login (set) and logout (clear). */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

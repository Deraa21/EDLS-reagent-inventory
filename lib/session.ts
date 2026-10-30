const COOKIE_NAME = "edls_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return atob(padded);
}
async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}
export async function createSession(email: string): Promise<string> {
  const secret = process.env.EDLS_SESSION_SECRET;
  if (!secret) throw new Error("Authentication is not configured. EDLS_SESSION_SECRET is missing.");
  const payload = base64UrlEncode(JSON.stringify({ email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return payload + "." + await sign(payload, secret);
}
export async function verifySession(token: string | undefined | null): Promise<{ email: string } | null> {
  const secret = process.env.EDLS_SESSION_SECRET;
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  try {
    const expected = await sign(payload, secret);
    if (expected.length !== signature.length) return null;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (mismatch !== 0) return null;
    const data = JSON.parse(base64UrlDecode(payload)) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: data.email };
  } catch { return null; }
}
export const sessionCookie = COOKIE_NAME;
export const sessionMaxAge = SESSION_TTL_SECONDS;

import "server-only";

export const AUTH_COOKIE = "dashboard_auth";
export const AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

// Cookie value is sha256(password). When the password rotates, all existing
// cookies stop matching automatically. crypto.subtle works in both Edge
// middleware and Node server actions.
export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Decode JWT exp without verification — used only for client-side expiry hints. */

export function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(
  token: string | null | undefined,
  skewSec = 30,
): boolean {
  if (!token) {
    return true;
  }
  const exp = decodeJwtExp(token);
  if (exp == null) {
    return false;
  }
  return exp <= Math.floor(Date.now() / 1000) + skewSec;
}

export function resolveEffectiveAccessToken(
  accessToken: string | null | undefined,
  legacyJwt: string | null | undefined,
): string | null {
  const token = accessToken ?? legacyJwt;
  if (!token || isAccessTokenExpired(token)) {
    return null;
  }
  return token;
}

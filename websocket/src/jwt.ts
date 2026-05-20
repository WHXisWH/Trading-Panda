import { jwtVerify, type JWTPayload } from "jose";

export type JwtVerifyResult =
  | { ok: true; userId: string; payload: JWTPayload }
  | { ok: false; code: 4001 | 4002 };

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtVerifyResult> {
  if (!token?.trim()) {
    return { ok: false, code: 4001 };
  }
  const key = new TextEncoder().encode(secret);
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) {
      return { ok: false, code: 4001 };
    }
    return { ok: true, userId, payload };
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : "";
    if (name === "JWTExpired") {
      return { ok: false, code: 4002 };
    }
    return { ok: false, code: 4001 };
  }
}

export function extractToken(request: Request): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    return queryToken;
  }
  const proto = request.headers.get("Sec-WebSocket-Protocol");
  if (!proto) {
    return null;
  }
  const parts = proto.split(",").map((p) => p.trim());
  const bearer = parts.find((p) => p.startsWith("bearer."));
  if (bearer) {
    return bearer.slice("bearer.".length);
  }
  return parts[0] || null;
}

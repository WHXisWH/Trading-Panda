import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { extractToken, verifyJwt } from "../src/jwt.js";

const secret = "test-jwt-secret-32-bytes-minimum!!";

async function signToken(
  payload: Record<string, unknown>,
  expiresInSec?: number,
): Promise<string> {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  if (expiresInSec !== undefined) {
    builder.setExpirationTime(`${expiresInSec}s`);
  } else {
    builder.setExpirationTime("1h");
  }
  return builder.sign(new TextEncoder().encode(secret));
}

describe("jwt", () => {
  it("verifies valid token with sub", async () => {
    const token = await signToken({ sub: "user-123", wallet: "0xabc" });
    const result = await verifyJwt(token, secret);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("user-123");
    }
  });

  it("rejects missing sub", async () => {
    const token = await signToken({ wallet: "0xabc" });
    const result = await verifyJwt(token, secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(4001);
    }
  });

  it("rejects expired token", async () => {
    const token = await signToken({ sub: "user-123" }, -10);
    const result = await verifyJwt(token, secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(4002);
    }
  });

  it("extracts token from query", () => {
    const req = new Request("https://ws.example/ws?token=abc123");
    expect(extractToken(req)).toBe("abc123");
  });

  it("extracts token from Sec-WebSocket-Protocol bearer", () => {
    const req = new Request("https://ws.example/ws", {
      headers: { "Sec-WebSocket-Protocol": "bearer.my-jwt-token" },
    });
    expect(extractToken(req)).toBe("my-jwt-token");
  });
});

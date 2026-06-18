import { describe, expect, it } from "vitest";
import { isAccessTokenExpired, resolveEffectiveAccessToken } from "@/lib/auth/accessToken";

function makeJwt(expSec: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: expSec }));
  return `${header}.${payload}.sig`;
}

describe("accessToken", () => {
  it("treats expired tokens as invalid", () => {
    const expired = makeJwt(Math.floor(Date.now() / 1000) - 60);
    expect(isAccessTokenExpired(expired)).toBe(true);
    expect(resolveEffectiveAccessToken(expired, null)).toBeNull();
  });

  it("keeps valid tokens", () => {
    const valid = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    expect(isAccessTokenExpired(valid)).toBe(false);
    expect(resolveEffectiveAccessToken(valid, null)).toBe(valid);
  });
});

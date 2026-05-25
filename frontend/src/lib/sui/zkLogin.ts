/**
 * zkLogin helpers — derive Sui address from Google id_token + salt.
 * OAuth redirect handled in /auth/zklogin-callback.
 */

import { jwtToAddress } from "@mysten/zklogin";

const SALT_STORAGE_KEY = "trading-panda-zklogin-salt";

export function getOrCreateZkLoginSalt(): string {
  if (typeof window === "undefined") return "0";
  const existing = localStorage.getItem(SALT_STORAGE_KEY);
  if (existing) return existing;
  const salt = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
  localStorage.setItem(SALT_STORAGE_KEY, salt);
  return salt;
}

export function deriveZkLoginAddress(idToken: string, salt: string): string {
  return jwtToAddress(idToken, salt);
}

export function buildGoogleOAuthUrl(redirectUri: string, nonce: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function parseIdTokenFromCallbackHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  return params.get("id_token");
}

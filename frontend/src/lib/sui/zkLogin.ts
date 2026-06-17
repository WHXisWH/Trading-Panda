/**
 * zkLogin helpers — derive Sui address from Google id_token + salt.
 * OAuth redirect handled in /auth/zklogin-callback.
 */

import { jwtToAddress } from "@mysten/zklogin";

const SALT_STORAGE_KEY = "trading-panda-zklogin-salt";
const RETURN_TO_STORAGE_KEY = "tp-zklogin-return-to";
const RESULT_STORAGE_KEY = "tp-zklogin-result";
const WALLET_AUTO_LOGIN_SUPPRESS_KEY = "tp-suppress-wallet-auto-login";
const CONNECT_MODAL_SUPPRESS_KEY = "tp-connect-modal-suppress";

export type ZkLoginResultKind = "success" | "error";

export interface ZkLoginDeferredResult {
  kind: ZkLoginResultKind;
  message?: string;
}

/** Only allow same-origin in-app paths (blocks open redirects). */
export function sanitizeZkLoginReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  if (path.startsWith("/auth/zklogin-callback")) {
    return "/";
  }
  return path;
}

export function saveZkLoginReturnTo(path?: string): void {
  if (typeof window === "undefined") return;
  const target = sanitizeZkLoginReturnPath(
    path ?? `${window.location.pathname}${window.location.search}`,
  );
  sessionStorage.setItem(RETURN_TO_STORAGE_KEY, target);
}

export function consumeZkLoginReturnTo(): string {
  if (typeof window === "undefined") return "/";
  const stored = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
  sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  return sanitizeZkLoginReturnPath(stored);
}

export function setZkLoginDeferredResult(result: ZkLoginDeferredResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
}

export function consumeZkLoginDeferredResult(): ZkLoginDeferredResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ZkLoginDeferredResult;
    if (parsed.kind === "success" || parsed.kind === "error") {
      return parsed;
    }
  } catch {
    /* ignore malformed payload */
  }
  return null;
}

/** Survives OAuth full-page redirect; blocks WalletAuthSync until user retries connect. */
export function suppressWalletAutoLoginForOAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WALLET_AUTO_LOGIN_SUPPRESS_KEY, "1");
}

export function releaseWalletAutoLoginSuppress(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WALLET_AUTO_LOGIN_SUPPRESS_KEY);
}

export function isWalletAutoLoginSuppressedByOAuth(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(WALLET_AUTO_LOGIN_SUPPRESS_KEY) === "1";
}

/** While connect modal is open, block WalletAuthSync from auto wallet sign-in. */
export function setConnectModalWalletLoginSuppress(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    sessionStorage.setItem(CONNECT_MODAL_SUPPRESS_KEY, "1");
  } else {
    sessionStorage.removeItem(CONNECT_MODAL_SUPPRESS_KEY);
  }
}

export function isConnectModalWalletLoginSuppress(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CONNECT_MODAL_SUPPRESS_KEY) === "1";
}

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

export function parseOAuthErrorFromCallbackHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  return params.get("error_description") ?? params.get("error");
}

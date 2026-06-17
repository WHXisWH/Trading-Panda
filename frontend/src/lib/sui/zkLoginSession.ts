/**
 * zkLogin session — ephemeral key pair + ZK proof for on-chain signing.
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import type { ZkLoginSignatureInputs } from "@mysten/sui/zklogin";
import {
  generateNonce,
  generateRandomness,
  genAddressSeed,
  getExtendedEphemeralPublicKey,
  jwtToAddress,
} from "@mysten/zklogin";
import { APP_SUI_NETWORK } from "@/lib/sui/network";
import { getOrCreateZkLoginSalt } from "@/lib/sui/zkLogin";
import { fetchZkLoginProof } from "@/lib/sui/zkLoginProver";

const SESSION_STORAGE_KEY = "tp-zklogin-pending-oauth";
const SESSION_PERSIST_KEY = "trading-panda-zklogin-session";
const EPHEMERAL_KEY_DURATION_EPOCHS = 2;

export interface ZkLoginPendingOAuth {
  ephemeralSecretKey: string;
  randomness: string;
  maxEpoch: number;
}

export interface ZkLoginPersistedSession extends ZkLoginPendingOAuth {
  walletAddress: string;
  proofInputs: ZkLoginSignatureInputs;
}

function suiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl(APP_SUI_NETWORK) });
}

export function loadPendingZkLoginOAuth(): ZkLoginPendingOAuth | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZkLoginPendingOAuth;
  } catch {
    return null;
  }
}

function savePendingZkLoginOAuth(session: ZkLoginPendingOAuth): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearPendingZkLoginOAuth(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function loadZkLoginSession(): ZkLoginPersistedSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_PERSIST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ZkLoginPersistedSession;
    if (!parsed.walletAddress || !parsed.proofInputs || !parsed.ephemeralSecretKey) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveZkLoginSession(session: ZkLoginPersistedSession): void {
  localStorage.setItem(SESSION_PERSIST_KEY, JSON.stringify(session));
}

export function clearZkLoginSession(): void {
  localStorage.removeItem(SESSION_PERSIST_KEY);
  clearPendingZkLoginOAuth();
}

export function getEphemeralKeypair(session: ZkLoginPendingOAuth): Ed25519Keypair {
  return Ed25519Keypair.fromSecretKey(session.ephemeralSecretKey);
}

export async function prepareZkLoginOAuthSession(): Promise<{ nonce: string }> {
  const client = suiClient();
  const { epoch } = await client.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + EPHEMERAL_KEY_DURATION_EPOCHS;
  const keypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  savePendingZkLoginOAuth({
    ephemeralSecretKey: keypair.getSecretKey(),
    randomness,
    maxEpoch,
  });

  return { nonce };
}

function decodeJwtPayload(idToken: string): { sub?: string; aud?: string | string[] } {
  const segment = idToken.split(".")[1];
  if (!segment) throw new Error("Invalid Google token");
  const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json) as { sub?: string; aud?: string | string[] };
}

function addressSeedFromJwt(idToken: string, salt: string): string {
  const decoded = decodeJwtPayload(idToken);
  if (!decoded.sub || !decoded.aud) {
    throw new Error("Google token is missing required claims");
  }
  const aud = typeof decoded.aud === "string" ? decoded.aud : decoded.aud[0];
  if (!aud) {
    throw new Error("Unsupported Google token audience format");
  }
  return genAddressSeed(salt, "sub", decoded.sub, aud).toString();
}

export async function finalizeZkLoginSession(idToken: string): Promise<ZkLoginPersistedSession> {
  const pending = loadPendingZkLoginOAuth();
  if (!pending) {
    throw new Error("zkLogin session expired. Please start Google sign-in again.");
  }

  const salt = getOrCreateZkLoginSalt();
  const walletAddress = jwtToAddress(idToken, salt);
  const keypair = getEphemeralKeypair(pending);
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

  const partialProof = await fetchZkLoginProof({
    jwt: idToken,
    extendedEphemeralPublicKey,
    maxEpoch: String(pending.maxEpoch),
    jwtRandomness: pending.randomness,
    salt,
    keyClaimName: "sub",
  });

  const addressSeed = addressSeedFromJwt(idToken, salt);
  const proofInputs: ZkLoginSignatureInputs = {
    ...partialProof,
    addressSeed,
  };

  const session: ZkLoginPersistedSession = {
    ...pending,
    walletAddress,
    proofInputs,
  };

  saveZkLoginSession(session);
  clearPendingZkLoginOAuth();
  return session;
}

export async function assertZkLoginSessionActive(session: ZkLoginPersistedSession): Promise<void> {
  const client = suiClient();
  const { epoch } = await client.getLatestSuiSystemState();
  if (Number(epoch) > session.maxEpoch) {
    clearZkLoginSession();
    throw new Error("zkLogin session expired. Please sign in with Google again.");
  }
}

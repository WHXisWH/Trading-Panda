/**
 * Module-level lock so only one wallet login runs app-wide.
 */

import { useSyncExternalStore } from "react";

let inFlightAddress: string | null = null;
let failedAddress: string | null = null;
const listeners = new Set<() => void>();

function notifyWalletLoginStatus(): void {
  listeners.forEach((listener) => listener());
}

function subscribeWalletLoginStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWalletLoginInFlightAddress(): string | null {
  return inFlightAddress;
}

/** Reactive in-flight address for UI (e.g. Navbar「登录中…」). */
export function useWalletLoginInFlight(): string | null {
  return useSyncExternalStore(
    subscribeWalletLoginStatus,
    getWalletLoginInFlightAddress,
    () => null,
  );
}

export function tryAcquireWalletLogin(walletAddress: string): boolean {
  const key = walletAddress.toLowerCase();
  if (inFlightAddress === key) return false;
  if (failedAddress === key) return false;
  inFlightAddress = key;
  notifyWalletLoginStatus();
  return true;
}

export function releaseWalletLogin(walletAddress: string): void {
  const key = walletAddress.toLowerCase();
  if (inFlightAddress === key) inFlightAddress = null;
  notifyWalletLoginStatus();
}

export function markWalletLoginFailed(walletAddress: string): void {
  failedAddress = walletAddress.toLowerCase();
  releaseWalletLogin(walletAddress);
}

export function clearWalletLoginFailure(walletAddress?: string): void {
  if (!walletAddress) {
    failedAddress = null;
    inFlightAddress = null;
    notifyWalletLoginStatus();
    return;
  }
  const key = walletAddress.toLowerCase();
  if (failedAddress === key) failedAddress = null;
  if (inFlightAddress === key) inFlightAddress = null;
  notifyWalletLoginStatus();
}

/** Call before reconnecting wallet after a failed sign (e.g. from Connect UI). */
export function resetWalletLoginState(): void {
  failedAddress = null;
  inFlightAddress = null;
  notifyWalletLoginStatus();
}

export function walletsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

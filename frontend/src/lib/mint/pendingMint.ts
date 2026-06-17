/** Persist chain-success / backend-pending mint for retry registration (Epic 1.2). */

export interface PendingMintRegistration {
  suiObjectId: string;
  suiTxDigest: string;
}

const STORAGE_KEY = "tp-pending-mint-registration";

export function savePendingMintRegistration(pending: PendingMintRegistration): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function loadPendingMintRegistration(): PendingMintRegistration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingMintRegistration;
    if (!parsed.suiObjectId || !parsed.suiTxDigest) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingMintRegistration(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

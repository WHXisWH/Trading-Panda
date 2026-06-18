import { walletSupportsPersonalMessageLogin } from "@/lib/sui/walletCompat";

export const DAPP_KIT_STORAGE_KEY = "sui-dapp-kit:wallet-connection-info";

export const AUTO_CONNECT_WALLET_NAMES = ["Slush", "Sui Wallet"] as const;

const BLOCKED_WALLET_KEY_PATTERNS = [/metamask/i, /coinbase wallet/i, /suisnap/i];

type WalletIdentity = {
  name?: string;
  id?: string;
};

type WalletFeatureSet = WalletIdentity & {
  features: Record<string, unknown>;
};

type PersistedWalletState = {
  state?: {
    lastConnectedWalletName?: string | null;
    lastConnectedAccountAddress?: string | null;
  };
  lastConnectedWalletName?: string | null;
  lastConnectedAccountAddress?: string | null;
};

export function getWalletIdentityKey(wallet: WalletIdentity): string {
  return `${wallet.name ?? ""} ${wallet.id ?? ""}`.trim();
}

export function isBlockedWalletKey(key: string): boolean {
  return BLOCKED_WALLET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function isBlockedWallet(wallet: WalletIdentity): boolean {
  return isBlockedWalletKey(getWalletIdentityKey(wallet));
}

/** @deprecated Use isBlockedWalletKey */
export function isBlockedWalletName(name: string): boolean {
  return isBlockedWalletKey(name);
}

export function isAutoConnectWallet(wallet: WalletIdentity): boolean {
  if (isBlockedWallet(wallet)) return false;
  return AUTO_CONNECT_WALLET_NAMES.includes(
    wallet.name as (typeof AUTO_CONNECT_WALLET_NAMES)[number],
  );
}

export function isLoginCompatibleWallet(wallet: WalletFeatureSet): boolean {
  if (isBlockedWallet(wallet)) {
    return false;
  }

  const features = wallet.features as {
    "sui:signTransaction"?: unknown;
    "sui:signTransactionBlock"?: unknown;
    "sui:signPersonalMessage"?: unknown;
    "sui:signMessage"?: unknown;
  };
  const canSignTx = Boolean(features["sui:signTransaction"] || features["sui:signTransactionBlock"]);
  return canSignTx && walletSupportsPersonalMessageLogin(features);
}

export function readPersistedWalletState(
  storageKey = DAPP_KIT_STORAGE_KEY,
  storage: Pick<Storage, "getItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): { walletKey: string; accountAddress: string } | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedWalletState;
    const walletKey = parsed.state?.lastConnectedWalletName ?? parsed.lastConnectedWalletName;
    const accountAddress =
      parsed.state?.lastConnectedAccountAddress ?? parsed.lastConnectedAccountAddress;

    if (!walletKey || !accountAddress) return null;
    return { walletKey, accountAddress };
  } catch {
    return null;
  }
}

export function shouldClearPersistedWallet(state: PersistedWalletState): boolean {
  const walletKey = state.state?.lastConnectedWalletName ?? state.lastConnectedWalletName;
  return Boolean(walletKey && isBlockedWalletKey(walletKey));
}

export function findWalletByStoredKey<T extends WalletIdentity>(
  wallets: readonly T[],
  storedKey: string,
): T | undefined {
  return wallets.find((wallet) => wallet.id === storedKey || wallet.name === storedKey);
}

export function sanitizeWalletConnectionStorage(
  storageKey = DAPP_KIT_STORAGE_KEY,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): boolean {
  if (!storage) return false;

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as PersistedWalletState;
    if (!shouldClearPersistedWallet(parsed)) return false;

    storage.removeItem(storageKey);
    return true;
  } catch {
    storage.removeItem(storageKey);
    return true;
  }
}

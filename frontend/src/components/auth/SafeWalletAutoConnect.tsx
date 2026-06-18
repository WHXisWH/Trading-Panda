"use client";

import { useConnectWallet, useCurrentWallet, useWallets } from "@mysten/dapp-kit";
import { useEffect, useRef } from "react";
import {
  findWalletByStoredKey,
  isAutoConnectWallet,
  readPersistedWalletState,
  sanitizeWalletConnectionStorage,
} from "@/lib/sui/walletConnection";

const AUTO_CONNECT_DELAY_MS = 1200;

/**
 * Reconnect only to Slush / Sui Wallet after extensions settle.
 * dapp-kit autoConnect is disabled to avoid MetaMask silent-connect noise.
 */
export function SafeWalletAutoConnect() {
  const { isConnected } = useCurrentWallet();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || isConnected || wallets.length === 0) return;

    const timer = window.setTimeout(() => {
      if (attemptedRef.current || isConnected) return;
      attemptedRef.current = true;

      sanitizeWalletConnectionStorage();

      const persisted = readPersistedWalletState();
      if (!persisted) return;

      const wallet = findWalletByStoredKey(wallets, persisted.walletKey);
      if (!wallet || !isAutoConnectWallet(wallet)) {
        sanitizeWalletConnectionStorage();
        return;
      }

      connect(
        {
          wallet,
          accountAddress: persisted.accountAddress,
          silent: true,
        },
        {
          onError: () => {
            sanitizeWalletConnectionStorage();
          },
        },
      );
    }, AUTO_CONNECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [connect, isConnected, wallets]);

  return null;
}

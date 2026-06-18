import { describe, expect, it } from "vitest";
import {
  findWalletByStoredKey,
  isAutoConnectWallet,
  isBlockedWallet,
  isBlockedWalletKey,
  isLoginCompatibleWallet,
  readPersistedWalletState,
  sanitizeWalletConnectionStorage,
  shouldClearPersistedWallet,
} from "./walletConnection";

describe("walletConnection", () => {
  it("blocks MetaMask by name and wallet id", () => {
    expect(isBlockedWalletKey("MetaMask")).toBe(true);
    expect(isBlockedWalletKey("io.metamask.snap")).toBe(true);
    expect(isBlockedWallet({ name: "MetaMask" })).toBe(true);
    expect(isBlockedWallet({ id: "io.metamask.snap", name: "Sui Snap" })).toBe(true);
    expect(
      isLoginCompatibleWallet({
        name: "MetaMask",
        features: {
          "sui:signTransaction": {},
          "sui:signPersonalMessage": {},
        },
      }),
    ).toBe(false);
  });

  it("allows only Slush and Sui Wallet for auto-connect", () => {
    expect(isAutoConnectWallet({ name: "Slush" })).toBe(true);
    expect(isAutoConnectWallet({ name: "Sui Wallet" })).toBe(true);
    expect(isAutoConnectWallet({ name: "MetaMask" })).toBe(false);
    expect(isAutoConnectWallet({ name: "Suiet" })).toBe(false);
  });

  it("clears persisted wallet state for blocked wallets", () => {
    expect(
      shouldClearPersistedWallet({
        state: { lastConnectedWalletName: "MetaMask", lastConnectedAccountAddress: "0x1" },
      }),
    ).toBe(true);
    expect(
      shouldClearPersistedWallet({
        state: { lastConnectedWalletName: "io.metamask.snap", lastConnectedAccountAddress: "0x1" },
      }),
    ).toBe(true);
    expect(
      shouldClearPersistedWallet({
        lastConnectedWalletName: "Sui Wallet",
        lastConnectedAccountAddress: "0x2",
      }),
    ).toBe(false);
  });

  it("resolves wallets by stored id or name", () => {
    const wallets = [
      { name: "Slush", id: "slush-id" },
      { name: "Sui Wallet", id: "sui-wallet-id" },
    ];

    expect(findWalletByStoredKey(wallets, "slush-id")?.name).toBe("Slush");
    expect(findWalletByStoredKey(wallets, "Sui Wallet")?.id).toBe("sui-wallet-id");
  });

  it("reads persisted wallet state from zustand storage", () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          state: {
            lastConnectedWalletName: "Slush",
            lastConnectedAccountAddress: "0xabc",
          },
          version: 0,
        }),
    };

    expect(readPersistedWalletState("sui-dapp-kit:wallet-connection-info", storage)).toEqual({
      walletKey: "Slush",
      accountAddress: "0xabc",
    });
  });

  it("removes blocked wallet entries from storage", () => {
    const storage = {
      data: JSON.stringify({
        state: { lastConnectedWalletName: "MetaMask", lastConnectedAccountAddress: "0xabc" },
        version: 0,
      }),
      getItem(key: string) {
        return key === "sui-dapp-kit:wallet-connection-info" ? this.data : null;
      },
      setItem() {},
      removeItem(key: string) {
        if (key === "sui-dapp-kit:wallet-connection-info") this.data = "";
      },
    };

    expect(sanitizeWalletConnectionStorage("sui-dapp-kit:wallet-connection-info", storage)).toBe(
      true,
    );
    expect(storage.data).toBe("");
  });
});

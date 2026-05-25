/**
 * Sign on app network with explicit chain. Falls back to legacy signMessage if needed.
 */

import { expectedSuiChain } from "@/lib/sui/network";

type WalletAccountLike = {
  address: string;
  chains: readonly string[];
};

type SignPersonalMessageWallet = {
  features: {
    "sui:signPersonalMessage"?: {
      signPersonalMessage: (input: {
        message: Uint8Array;
        account: WalletAccountLike;
        chain: string;
      }) => Promise<{ bytes: Uint8Array; signature: string }>;
    };
    "sui:signMessage"?: {
      signMessage: (input: {
        message: Uint8Array;
        account: WalletAccountLike;
        chain: string;
      }) => Promise<{ messageBytes: Uint8Array; signature: string }>;
    };
  };
};

function isAuthPageError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Authorization page could not be loaded/i.test(msg);
}

export async function signPersonalMessageOnAppChain(
  wallet: SignPersonalMessageWallet,
  account: WalletAccountLike,
  message: Uint8Array,
): Promise<string> {
  const chain = expectedSuiChain();
  const signPm = wallet.features["sui:signPersonalMessage"];
  const signLegacy = wallet.features["sui:signMessage"];

  if (signPm) {
    try {
      const { signature } = await signPm.signPersonalMessage({
        message,
        account,
        chain,
      });
      return signature;
    } catch (err) {
      if (!signLegacy || !isAuthPageError(err)) {
        throw err;
      }
      console.warn(
        "[walletSign] signPersonalMessage failed (auth page), trying signMessage…",
        err,
      );
    }
  }

  if (signLegacy) {
    const { signature } = await signLegacy.signMessage({
      message,
      account,
      chain,
    });
    return signature;
  }

  throw new Error("当前钱包不支持 signPersonalMessage / signMessage");
}

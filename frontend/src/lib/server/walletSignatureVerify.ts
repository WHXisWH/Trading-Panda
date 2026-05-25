/**
 * Wallet login signature verification (Ed25519 + ZkLogin via Sui fullnode).
 * Slush / zkLogin accounts return scheme flag 5; Python backend only verifies Ed25519.
 */

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

const LOGIN_MESSAGE_PREFIX = "TradingPanda:login:";

function appSuiNetwork(): "testnet" | "mainnet" {
  return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

function suiClient(): SuiClient {
  const network = appSuiNetwork();
  return new SuiClient({ url: getFullnodeUrl(network) });
}

export function walletLoginMessage(nonce: string): string {
  return `${LOGIN_MESSAGE_PREFIX}${nonce.trim()}`;
}

export async function verifyWalletLoginSignature(
  message: string,
  signature: string,
  walletAddress: string,
): Promise<void> {
  await verifyPersonalMessageSignature(
    new TextEncoder().encode(message),
    signature,
    { client: suiClient(), address: walletAddress },
  );
}

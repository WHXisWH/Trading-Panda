import { Transaction } from "@mysten/sui/transactions";
import { computeAllowedPairsHash, computePolicyHash } from "@/lib/agentWallet/policyHash";
import type { PolicyDraft } from "@/types/agent-wallet";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const CLOCK_OBJ = "0x0000000000000000000000000000000000000000000000000000000000000006";

export async function buildPausePolicyTx(
  policyObjectId: string,
  paused: boolean,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::trading_policy::pause_policy`,
    arguments: [tx.object(policyObjectId), tx.pure.bool(paused), tx.object(CLOCK_OBJ)],
  });
  return tx;
}

export async function buildRevokeAgentTx(policyObjectId: string): Promise<Transaction> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::trading_policy::revoke_agent`,
    arguments: [tx.object(policyObjectId), tx.object(CLOCK_OBJ)],
  });
  return tx;
}

export async function buildTightenPolicyTx(
  policyObjectId: string,
  current: PolicyDraft,
  next: PolicyDraft,
): Promise<Transaction> {
  const allowedPairsHash = await computeAllowedPairsHash(next.allowedPairs);
  const policyHashHex = await computePolicyHash({
    allowedPairs: next.allowedPairs,
    maxNotionalPerTrade: next.maxNotionalPerTrade,
    maxDailyLoss: next.maxDailyLoss,
    maxOpenPositions: next.maxOpenPositions,
    cooldownMs: next.cooldownMs,
    maxProofsPerDay: next.maxProofsPerDay,
    proofMode: next.proofMode,
  });
  const policyHashBytes = Uint8Array.from(
    policyHashHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::trading_policy::tighten_policy`,
    arguments: [
      tx.object(policyObjectId),
      tx.pure.vector("u8", Array.from(allowedPairsHash)),
      tx.pure.u64(Math.round(next.maxNotionalPerTrade)),
      tx.pure.u64(Math.round(next.maxDailyLoss)),
      tx.pure.u64(10_000),
      tx.pure.u64(next.maxOpenPositions),
      tx.pure.u64(next.cooldownMs),
      tx.pure.u64(next.maxProofsPerDay),
      tx.pure.vector("u8", Array.from(policyHashBytes)),
      tx.object(CLOCK_OBJ),
    ],
  });

  void current;
  return tx;
}

export function extractTxDigest(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { digest?: string; effects?: { transactionDigest?: string } };
  return r.digest ?? r.effects?.transactionDigest ?? null;
}

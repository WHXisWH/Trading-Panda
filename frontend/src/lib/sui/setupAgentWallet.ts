import { Transaction } from "@mysten/sui/transactions";
import { computeAllowedPairsHash, computePolicyHash } from "@/lib/agentWallet/policyHash";
import type { PolicyDraft } from "@/types/agent-wallet";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const CLOCK_OBJ = "0x0000000000000000000000000000000000000000000000000000000000000006";

const MODE_TRAINING_LEDGER = 1;

export async function buildSetupAgentWalletTx(
  pandaSuiObjectId: string,
  agentSignerAddress: string,
  draft: PolicyDraft,
): Promise<Transaction> {
  const allowedPairsHash = await computeAllowedPairsHash(draft.allowedPairs);
  const policyHashHex = await computePolicyHash({
    allowedPairs: draft.allowedPairs,
    maxNotionalPerTrade: draft.maxNotionalPerTrade,
    maxDailyLoss: draft.maxDailyLoss,
    maxOpenPositions: draft.maxOpenPositions,
    cooldownMs: draft.cooldownMs,
    maxProofsPerDay: draft.maxProofsPerDay,
    proofMode: draft.proofMode,
  });
  const policyHashBytes = Uint8Array.from(
    policyHashHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_wallet::setup_agent_wallet`,
    arguments: [
      tx.object(pandaSuiObjectId),
      tx.pure.address(agentSignerAddress),
      tx.pure.u8(MODE_TRAINING_LEDGER),
      tx.pure.vector("u8", Array.from(allowedPairsHash)),
      tx.pure.u64(Math.round(draft.maxNotionalPerTrade)),
      tx.pure.u64(Math.round(draft.maxDailyLoss)),
      tx.pure.u64(10_000),
      tx.pure.u64(draft.maxOpenPositions),
      tx.pure.u64(draft.cooldownMs),
      tx.pure.u64(draft.maxProofsPerDay),
      tx.pure.u64(0),
      tx.pure.vector("u8", Array.from(policyHashBytes)),
      tx.object(CLOCK_OBJ),
    ],
  });
  return tx;
}

export function extractTxDigest(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { digest?: string; effects?: { transactionDigest?: string } };
  return r.digest ?? r.effects?.transactionDigest ?? null;
}

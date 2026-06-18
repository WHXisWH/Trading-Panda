/** Hash allowed pairs for on-chain allowed_pairs_hash (sorted comma join). */

import { canonicalMarketPair } from "@/lib/market/canonicalMarketPair";

export async function computeAllowedPairsHash(pairs: string[]): Promise<Uint8Array> {
  const normalized = [...pairs].map(canonicalMarketPair).filter(Boolean).sort();
  const payload = normalized.join(",");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return new Uint8Array(digest);
}

export async function computePolicyHash(draft: {
  trainingBudget: number;
  allowedPairs: string[];
  maxNotionalPerTrade: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  cooldownMs: number;
  maxProofsPerDay: number;
  proofMode: string;
}): Promise<string> {
  const payload = JSON.stringify({
    training_budget: draft.trainingBudget,
    allowed_pairs: [...draft.allowedPairs].map(canonicalMarketPair).filter(Boolean).sort(),
    max_notional_per_trade: draft.maxNotionalPerTrade,
    max_daily_loss: draft.maxDailyLoss,
    max_open_positions: draft.maxOpenPositions,
    cooldown_ms: draft.cooldownMs,
    max_proofs_per_day: draft.maxProofsPerDay,
    proof_mode: draft.proofMode,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

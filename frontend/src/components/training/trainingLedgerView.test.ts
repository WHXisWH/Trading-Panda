import { describe, expect, it } from "vitest";
import { buildTrainingPreflightItems, summarizeLatestDecision } from "./trainingLedgerView";

describe("trainingLedgerView", () => {
  it("marks training as blocked when wallet, strategy, and pair checks fail", () => {
    const items = buildTrainingPreflightItems({
      walletReady: false,
      hasStrategy: false,
      policyPaused: true,
      currentPair: "DEEP/SUI",
      currentPairAllowed: false,
      currentPairSubscribed: false,
      wsStatus: "connecting",
      lastTickAgeSec: 180,
    });

    expect(items.find((item) => item.label === "Wallet")?.ok).toBe(false);
    expect(items.find((item) => item.label === "Strategy")?.ok).toBe(false);
    expect(items.find((item) => item.label === "Pair")?.ok).toBe(false);
    expect(items.find((item) => item.label === "Policy")?.ok).toBe(false);
    expect(items.find((item) => item.label === "Tick freshness")?.ok).toBe(false);
  });

  it("summarizes the latest executed decision with ledger delta and proof context", () => {
    const summary = summarizeLatestDecision({
      intent: {
        id: "intent-1",
        panda_id: "panda-1",
        vault_id: null,
        policy_id: null,
        policy_version: 4,
        mode: "training_ledger",
        pair: "DEEP/SUI",
        side: "BUY",
        notional: 50,
        reference_price: 2,
        max_slippage_bps: null,
        final_score: 0.82,
        reason: "Strong alignment",
        decision_hash: "hash-1234567890",
        proof_eligible: true,
        proof_requested: false,
        proof_request_source: null,
        proof_key: null,
        status: "EXECUTED",
        rejection_reason: null,
      },
      tradeFact: {
        id: "fact-1",
        panda_id: "panda-1",
        order_intent_id: "intent-1",
        pair: "DEEP/SUI",
        side: "BUY",
        mode: "training_ledger",
        review_status: "pending",
        proof_status: "eligible",
        proof_key: null,
        fact_hash: "fact-hash",
        realized_pnl: 1.5,
        decision_snapshot: {},
        ledger_snapshot_before: {
          cash_balance: 100,
          equity: 100,
          realized_pnl: 0,
          unrealized_pnl: 0,
          positions: [],
        },
        ledger_snapshot_after: {
          cash_balance: 50,
          equity: 101.5,
          realized_pnl: 1.5,
          unrealized_pnl: 0,
          positions: [{ asset: "DEEP", quantity: 0.5 }],
        },
      },
    });

    expect(summary?.title).toBe("BUY · DEEP/SUI");
    expect(summary?.statusLabel).toBe("Paper executed");
    expect(summary?.ledgerDelta).toContain("Cash -$50.00");
    expect(summary?.ledgerDelta).toContain("Equity +$1.50");
    expect(summary?.tradeFactId).toBe("fact-1");
    expect(summary?.canOpenProof).toBe(true);
  });

  it("summarizes a hold intent as an observable training decision", () => {
    const summary = summarizeLatestDecision({
      intent: {
        id: "intent-hold",
        panda_id: "panda-1",
        vault_id: null,
        policy_id: null,
        policy_version: 4,
        mode: "training_ledger",
        pair: "DEEP-SUI",
        side: "HOLD",
        notional: 0,
        reference_price: 2,
        max_slippage_bps: null,
        final_score: 0.56,
        reason: "Below entry threshold",
        decision_hash: "hash-hold-1234567890",
        proof_eligible: false,
        proof_requested: false,
        proof_request_source: null,
        proof_key: null,
        status: "DECIDED",
        rejection_reason: null,
      },
      tradeFact: null,
    });

    expect(summary?.title).toBe("HOLD · DEEP-SUI");
    expect(summary?.statusLabel).toBe("Holding");
    expect(summary?.statusTone).toBe("warn");
    expect(summary?.scoreLabel).toBe("0.56");
    expect(summary?.reason).toBe("Below entry threshold");
    expect(summary?.canOpenProof).toBe(false);
  });
});

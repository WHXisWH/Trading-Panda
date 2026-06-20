import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TradeFactEvidenceContent } from "./TradeFactDrawer";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("TradeFactDrawer", () => {
  it("renders executed trade evidence in readable rows", () => {
    const html = renderToStaticMarkup(
      createElement(TradeFactEvidenceContent, {
        intent: {
          id: "intent-1",
          panda_id: "panda-1",
          vault_id: null,
          policy_id: null,
          policy_version: 1,
          mode: "training_ledger",
          pair: "DEEP-SUI",
          side: "BUY",
          notional: 40,
          reference_price: 0.02329,
          max_slippage_bps: null,
          final_score: 1.202809,
          reason: null,
          decision_hash: "hash",
          proof_eligible: false,
          proof_requested: false,
          proof_request_source: null,
          proof_key: null,
          status: "EXECUTED",
          rejection_reason: null,
          decision_snapshot: { entry_threshold: 0.455 },
          market_snapshot: { rsi: 24, market_regime: "bull" },
        },
        tradeFact: {
          id: "fact-1",
          panda_id: "panda-1",
          order_intent_id: "intent-1",
          pair: "DEEP-SUI",
          side: "BUY",
          mode: "training_ledger",
          review_status: "pending",
          proof_status: "not_requested",
          proof_key: null,
          fact_hash: "fact-hash",
          realized_pnl: 0,
          decision_snapshot: {
            entry_threshold: 0.455,
            steps: [{ step: 1, name: "策略原始信号", score: 1 }],
          },
          ledger_snapshot_before: {
            cash_balance: 10000,
            equity: 10000,
            positions: [],
          },
          ledger_snapshot_after: {
            cash_balance: 9960,
            equity: 9960,
            positions: [{ asset: "DEEP", quantity: 1717.4753 }],
          },
          execution_snapshot: {
            notional: 40,
            quantity: 1717.4753,
            reference_price: 0.02329,
            position_pct: 0.004,
          },
        },
      }),
    );

    expect(html).toContain("Executed notional");
    expect(html).toContain("$40");
    expect(html).toContain("Ledger after");
    expect(html).toContain("$9,960");
    expect(html).toContain("DEEP × 1,717.4753");
    expect(html).toContain("8-step reasoning");
  });
});

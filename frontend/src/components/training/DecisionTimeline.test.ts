import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecisionTimeline } from "./DecisionTimeline";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("DecisionTimeline", () => {
  it("labels hold intents as observed decisions", () => {
    const html = renderToStaticMarkup(
      createElement(DecisionTimeline, {
        intents: [
          {
            id: "intent-hold",
            panda_id: "panda-1",
            vault_id: null,
            policy_id: null,
            policy_version: 1,
            mode: "training_ledger",
            pair: "DEEP-SUI",
            side: "HOLD",
            notional: 0,
            reference_price: 2,
            max_slippage_bps: null,
            final_score: 0.56,
            reason: "Below entry threshold",
            decision_hash: "hash-hold",
            proof_eligible: false,
            proof_requested: false,
            proof_request_source: null,
            proof_key: null,
            status: "DECIDED",
            rejection_reason: null,
            created_at: "2026-06-20T00:00:00Z",
          },
        ],
      }),
    );

    expect(html).toContain("HOLD · DEEP-SUI");
    expect(html).toContain("HOLD_OBSERVED");
    expect(html).not.toContain("ORDER_INTENT");
  });
});

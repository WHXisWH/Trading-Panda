import { describe, expect, it } from "vitest";
import {
  agentWalletSetupPath,
  chainProofPath,
  reviewPath,
  safetyPath,
  strategyPath,
  trainingLedgerPath,
} from "@/lib/ui/routeJump";

describe("routeJump MVP journey", () => {
  it("builds agent wallet setup path", () => {
    expect(agentWalletSetupPath("panda-1")).toBe(
      "/agent-wallet?panda=panda-1&step=no-vault",
    );
  });

  it("builds strategy and training paths", () => {
    expect(strategyPath("abc")).toBe("/strategy/abc");
    expect(trainingLedgerPath("abc")).toBe("/training-ledger/abc");
    expect(safetyPath("abc")).toBe("/safety/abc");
  });

  it("builds proof and review query routes", () => {
    expect(chainProofPath("p1", "fact-9")).toBe("/chain-proof?panda=p1&fact=fact-9");
    expect(reviewPath("p1", "fact-9")).toBe("/review?panda=p1&fact=fact-9");
  });
});

describe("mintRoutes re-export", () => {
  it("keeps backward compatible agent wallet path", async () => {
    const { agentWalletSetupPath: legacy } = await import("@/lib/mint/mintRoutes");
    expect(legacy("x")).toBe("/agent-wallet?panda=x&step=no-vault");
  });
});

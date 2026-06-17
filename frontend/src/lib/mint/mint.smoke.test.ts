import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPendingMintRegistration,
  loadPendingMintRegistration,
  savePendingMintRegistration,
} from "@/lib/mint/pendingMint";

describe("pendingMint registration retry", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("persists and loads pending chain mint", () => {
    savePendingMintRegistration({
      suiObjectId: "0xabc",
      suiTxDigest: "0xdigest",
    });
    expect(loadPendingMintRegistration()).toEqual({
      suiObjectId: "0xabc",
      suiTxDigest: "0xdigest",
    });
  });

  it("clears pending mint after successful sync", () => {
    savePendingMintRegistration({
      suiObjectId: "0xabc",
      suiTxDigest: "0xdigest",
    });
    clearPendingMintRegistration();
    expect(loadPendingMintRegistration()).toBeNull();
  });

  it("returns null for invalid storage payload", () => {
    sessionStorage.setItem("tp-pending-mint-registration", "{bad");
    expect(loadPendingMintRegistration()).toBeNull();
  });
});

describe("parseMintError wallet reject", () => {
  it("maps user rejection to rejected kind", async () => {
    const { parseMintError } = await import("@/lib/sui/parseMintError");
    const parsed = parseMintError(new Error("User rejected the request"));
    expect(parsed.kind).toBe("rejected");
  });
});

describe("agent wallet route jump", () => {
  it("builds setup path with no-vault step", async () => {
    const { agentWalletSetupPath } = await import("@/lib/ui/routeJump");
    expect(agentWalletSetupPath("panda-1")).toBe(
      "/agent-wallet?panda=panda-1&step=no-vault",
    );
  });
});

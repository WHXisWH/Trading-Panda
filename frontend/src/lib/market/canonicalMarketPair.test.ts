import { describe, expect, it } from "vitest";
import {
  canonicalMarketPair,
  dedupeMarketPairs,
  sameMarketPair,
} from "@/lib/market/canonicalMarketPair";

describe("canonicalMarketPair", () => {
  it("unifies slash, underscore, and dash separators", () => {
    expect(canonicalMarketPair("DEEP/SUI")).toBe("DEEP-SUI");
    expect(canonicalMarketPair("SUI_USDC")).toBe("SUI-USDC");
    expect(canonicalMarketPair("SUI-USDC")).toBe("SUI-USDC");
  });

  it("dedupes equivalent pairs", () => {
    expect(dedupeMarketPairs(["DEEP/SUI", "DEEP-SUI", "SUI/USDC", "SUI-USDC"])).toEqual([
      "DEEP-SUI",
      "SUI-USDC",
    ]);
  });

  it("matches pairs regardless of separator", () => {
    expect(sameMarketPair("DEEP/SUI", "DEEP-SUI")).toBe(true);
    expect(sameMarketPair("SUI-USDC", "SUI/USDC")).toBe(true);
  });
});

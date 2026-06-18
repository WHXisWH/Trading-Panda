import { describe, expect, it } from "vitest";
import {
  computePoolLiquidityUsd,
  findExactMonitorPairRow,
  findHealthPoolRow,
  findMonitorPairRow,
  mergeMonitorRows,
  parseMarketPairLegs,
} from "@/lib/market/poolStats";

describe("poolStats", () => {
  const rows = [
    {
      pool: "DEEP_USDC",
      pair: "DEEP-USDC",
      base_asset: "DEEP",
      quote_asset: "USDC",
      stable_quote: true,
      volume_24h: 100_000,
      spread_bps: 30,
      bid_depth: 1000,
      ask_depth: 900,
    },
    {
      pool: "SUI_USDC",
      pair: "SUI-USDC",
      base_asset: "SUI",
      quote_asset: "USDC",
      stable_quote: true,
      volume_24h: 9_000_000,
      spread_bps: 4,
      bid_depth: 8000,
      ask_depth: 3600,
    },
  ];

  it("parses pair legs", () => {
    expect(parseMarketPairLegs("DEEP/SUI")).toEqual({ base: "DEEP", quote: "SUI" });
    expect(parseMarketPairLegs("SUI-USDC")).toEqual({ base: "SUI", quote: "USDC" });
  });

  it("matches exact pool labels", () => {
    expect(findMonitorPairRow(rows, "SUI-USDC")?.pool).toBe("SUI_USDC");
    expect(findMonitorPairRow(rows, "DEEP_USDC")?.pair).toBe("DEEP-USDC");
  });

  it("falls back to same-base USDC pool when quote differs", () => {
    expect(findMonitorPairRow(rows, "DEEP-SUI")?.pool).toBe("DEEP_USDC");
    expect(findMonitorPairRow(rows, "DEEP/SUI")?.pool).toBe("DEEP_USDC");
  });

  it("matches health pools when ranked pairs omit the pool", () => {
    const healthPools = {
      "DEEP-SUI": {
        pool: "DEEP_SUI",
        volume_24h: 42_000,
        spread_bps: 6.1,
        bid_depth: 1200,
        ask_depth: 900,
        base_decimals: 6,
      },
      "SUI-USDC": {
        pool: "SUI_USDC",
        volume_24h: 9_000_000,
        spread_bps: 4,
        bid_depth: 8000,
        ask_depth: 7000,
      },
    };
    expect(findHealthPoolRow(healthPools, "DEEP-SUI")?.pool).toBe("DEEP_SUI");
    expect(findHealthPoolRow(healthPools, "DEEP/SUI")?.bid_depth).toBe(1200);
  });

  it("merges exact health depth with ranked pair stats", () => {
    const pairsRow = rows[1];
    const healthRow = findHealthPoolRow(
      {
        "SUI-USDC": {
          pool: "SUI_USDC",
          volume_24h: 9_500_000,
          spread_bps: 3.5,
          bid_depth: 9000,
          ask_depth: 8500,
        },
      },
      "SUI-USDC",
    );
    const merged = mergeMonitorRows(pairsRow, healthRow, findExactMonitorPairRow(rows, "SUI-USDC"));
    expect(merged?.volume_24h).toBe(9_500_000);
    expect(merged?.bid_depth).toBe(8000);
    expect(computePoolLiquidityUsd(
      { bidDepth: 8000, askDepth: 3600 },
      3.5,
    )).toBe(40_600);
  });
});

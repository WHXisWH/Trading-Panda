import { describe, expect, it } from "vitest";
import { formatMarketDateTime, normalizeUnixSeconds } from "@/lib/market/formatMarketTime";

describe("formatMarketTime", () => {
  it("normalizes ms timestamps to seconds", () => {
    expect(normalizeUnixSeconds(1_700_000_000_000)).toBe(1_700_000_000);
    expect(normalizeUnixSeconds(1_700_000_000)).toBe(1_700_000_000);
  });

  it("formats unix seconds in a fixed timezone", () => {
    const formatted = formatMarketDateTime(1_700_000_000, "Asia/Shanghai");
    expect(formatted).toMatch(/\d{2}\/\d{2}/);
    expect(formatted).toContain(":");
  });
});

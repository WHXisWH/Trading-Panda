import { describe, expect, it } from "vitest";
import { pickNewerMarketPrice } from "@/lib/market/toolbarMetrics";

describe("pickNewerMarketPrice", () => {
  it("returns the only available price", () => {
    expect(pickNewerMarketPrice({ price: 1.2, ts: 10 }, {})).toBe(1.2);
    expect(pickNewerMarketPrice({}, { price: 3.4, ts: 20 })).toBe(3.4);
  });

  it("prefers newer timestamp", () => {
    expect(
      pickNewerMarketPrice({ price: 1.0, ts: 100 }, { price: 1.1, ts: 200 }),
    ).toBe(1.1);
    expect(
      pickNewerMarketPrice({ price: 1.2, ts: 300 }, { price: 1.1, ts: 200 }),
    ).toBe(1.2);
  });

  it("prefers REST on equal timestamps", () => {
    expect(
      pickNewerMarketPrice({ price: 1.0, ts: 100 }, { price: 1.1, ts: 100 }),
    ).toBe(1.1);
  });
});

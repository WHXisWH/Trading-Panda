import { describe, expect, it } from "vitest";
import {
  CANDLES_MEMORY_CAP,
  capCandleBars,
  mergeCandleBars,
  tailRefreshMs,
} from "@/lib/market/candleStore";

describe("candleStore", () => {
  it("merges bars by timestamp", () => {
    const merged = mergeCandleBars(
      [{ t: 100, o: 1, h: 1, l: 1, c: 1, v: 1 }],
      [{ t: 100, o: 2, h: 2, l: 2, c: 2, v: 2 }, { t: 200, o: 3, h: 3, l: 3, c: 3, v: 3 }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].c).toBe(2);
    expect(merged[1].t).toBe(200);
  });

  it("caps bars keeping newest", () => {
    const bars = Array.from({ length: CANDLES_MEMORY_CAP + 10 }, (_, i) => ({
      t: i,
      o: 1,
      h: 1,
      l: 1,
      c: 1,
      v: 1,
    }));
    const capped = capCandleBars(bars);
    expect(capped).toHaveLength(CANDLES_MEMORY_CAP);
    expect(capped[0].t).toBe(10);
    expect(capped[capped.length - 1].t).toBe(CANDLES_MEMORY_CAP + 9);
  });

  it("maps tail refresh intervals", () => {
    expect(tailRefreshMs("1m")).toBe(60_000);
    expect(tailRefreshMs("1h")).toBe(3_600_000);
  });
});

import { describe, expect, it } from "vitest";
import type { UTCTimestamp } from "lightweight-charts";
import {
  bollingerFromBars,
  emaFromBars,
  macdFromCloses,
  rsiFromCloses,
  smaFromBars,
} from "@/lib/chart/indicators/math";
import {
  canAddIndicator,
  computeIndicator,
  filterIndicatorDefinitions,
  sanitizeIndicatorSelection,
} from "@/lib/chart/indicators/registry";
import { buildChartPaneLayout, indicatorPriceScaleId } from "@/lib/chart/indicators/layout";
import type { OhlcBar } from "@/lib/chart/indicators/types";

function bars(closes: number[]): OhlcBar[] {
  return closes.map((close, index) => ({
    time: (index + 1) as UTCTimestamp,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}

describe("chart indicators math", () => {
  it("computes SMA with expected length", () => {
    const data = bars([1, 2, 3, 4, 5, 6, 7]);
    const ma7 = smaFromBars(data, 7);
    expect(ma7).toHaveLength(1);
    expect(ma7[0].value).toBeCloseTo(4);
  });

  it("computes EMA for full bar series", () => {
    const data = bars([10, 11, 12, 11, 10]);
    const ema = emaFromBars(data, 3);
    expect(ema).toHaveLength(5);
    expect(ema[ema.length - 1].value).toBeGreaterThan(0);
  });

  it("computes RSI in 0-100 range", () => {
    const closesArr = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
    const rsi = rsiFromCloses(closesArr, 14);
    expect(rsi.length).toBeGreaterThan(0);
    for (const point of rsi) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it("computes MACD triple series", () => {
    const closesArr = Array.from({ length: 60 }, (_, i) => 100 + i * 0.2);
    const { macd, signal, histogram } = macdFromCloses(closesArr);
    expect(macd.length).toBeGreaterThan(0);
    expect(signal.length).toBe(macd.length);
    expect(histogram.length).toBe(macd.length);
  });

  it("computes Bollinger bands", () => {
    const data = bars(Array.from({ length: 25 }, (_, i) => 50 + i * 0.1));
    const { upper, middle, lower } = bollingerFromBars(data, 20, 2);
    expect(upper.length).toBe(6);
    expect(middle.length).toBe(6);
    expect(lower.length).toBe(6);
    expect(upper[0].value).toBeGreaterThan(middle[0].value);
    expect(lower[0].value).toBeLessThan(middle[0].value);
  });
});

describe("chart indicators registry", () => {
  it("filters by alias and name", () => {
    expect(filterIndicatorDefinitions("rsi").some((d) => d.id === "rsi:14")).toBe(true);
    expect(filterIndicatorDefinitions("布林带").some((d) => d.id === "boll:20,2")).toBe(true);
  });

  it("enforces overlay and sub limits", () => {
    const fourOverlays = ["sma:7", "sma:20", "sma:25", "ema:12"] as const;
    expect(canAddIndicator([...fourOverlays], "boll:20,2", 2)).toBe(true);
    const fiveOverlays = [...fourOverlays, "boll:20,2"] as const;
    expect(canAddIndicator([...fiveOverlays], "rsi:14", 2)).toBe(true);
    expect(canAddIndicator([...fiveOverlays], "sma:7", 2)).toBe(true);
    const twoSubs = ["rsi:14", "macd:12,26,9"] as const;
    expect(canAddIndicator([...twoSubs], "sma:7", 2)).toBe(true);
    expect(canAddIndicator([...twoSubs], "macd:12,26,9", 1)).toBe(true);
    expect(canAddIndicator(["rsi:14"], "macd:12,26,9", 1)).toBe(false);
  });

  it("sanitizes invalid storage payload", () => {
    const cleaned = sanitizeIndicatorSelection(["nope", "sma:7", "rsi:14"], 2);
    expect(cleaned).toEqual(["sma:7", "rsi:14"]);
  });

  it("allows empty selection", () => {
    expect(sanitizeIndicatorSelection([], 2)).toEqual([]);
  });

  it("computes registry indicator series", () => {
    const data = bars(Array.from({ length: 40 }, (_, i) => 10 + i * 0.05));
    const series = computeIndicator("macd:12,26,9", data);
    expect(series.some((s) => s.key === "hist")).toBe(true);
  });
});

describe("chart pane layout", () => {
  it("allocates sub-pane bands above volume", () => {
    const layout = buildChartPaneLayout(["sma:7", "rsi:14", "macd:12,26,9"]);
    expect(layout.subPanes).toHaveLength(2);
    expect(layout.subPanes[0].scaleMargins.bottom).toBe(0.14);
    expect(layout.candle.bottom).toBeCloseTo(0.52, 2);
    expect(layout.volume.top).toBeCloseTo(0.86, 2);
  });

  it("uses colon-free price scale ids", () => {
    expect(indicatorPriceScaleId("rsi:14")).toBe("sub-rsi-14");
    expect(indicatorPriceScaleId("macd:12,26,9")).toBe("sub-macd-12-26-9");
  });
});

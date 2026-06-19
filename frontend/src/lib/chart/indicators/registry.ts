import {
  bollingerFromBars,
  emaFromBars,
  macdFromBars,
  rsiFromBars,
  smaFromBars,
} from "@/lib/chart/indicators/math";
import type {
  ComputedIndicatorSeries,
  IndicatorDefinition,
  IndicatorId,
  OhlcBar,
} from "@/lib/chart/indicators/types";

const MA7_COLOR = "#d4a017";
const MA20_COLOR = "#4a6d8c";
const MA25_COLOR = "#7b5ea7";
const EMA12_COLOR = "#c45c26";
const RSI_COLOR = "#2d8a6e";
const MACD_LINE_COLOR = "#4a6d8c";
const MACD_SIGNAL_COLOR = "#c45c26";
const MACD_HIST_UP = "rgba(45, 90, 61, 0.55)";
const MACD_HIST_DOWN = "rgba(194, 58, 58, 0.55)";
const BOLL_UPPER = "rgba(194, 58, 58, 0.75)";
const BOLL_MIDDLE = "#4a6d8c";
const BOLL_LOWER = "rgba(45, 90, 61, 0.75)";

export const DEFAULT_INDICATOR_IDS: IndicatorId[] = ["sma:7", "sma:25"];

export const MAX_OVERLAY_INDICATORS = 5;
export const MAX_SUB_INDICATORS = 2;
export const MAX_SUB_INDICATORS_NARROW = 1;

const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    id: "sma:7",
    name: "MA(7)",
    aliases: ["ma7", "sma7", "均线7", "moving average 7"],
    category: "trend",
    pane: "overlay",
    description: "7-period simple moving average.",
    compute: (bars) => [
      {
        key: "line",
        label: "MA(7)",
        color: MA7_COLOR,
        kind: "line",
        data: smaFromBars(bars, 7),
      },
    ],
  },
  {
    id: "sma:20",
    name: "MA(20)",
    aliases: ["ma20", "sma20", "均线20", "moving average 20"],
    category: "trend",
    pane: "overlay",
    description: "20-period SMA — matches strategy MA20 rules.",
    compute: (bars) => [
      {
        key: "line",
        label: "MA(20)",
        color: MA20_COLOR,
        kind: "line",
        data: smaFromBars(bars, 20),
      },
    ],
  },
  {
    id: "sma:25",
    name: "MA(25)",
    aliases: ["ma25", "sma25", "均线25", "moving average 25"],
    category: "trend",
    pane: "overlay",
    description: "25-period simple moving average.",
    compute: (bars) => [
      {
        key: "line",
        label: "MA(25)",
        color: MA25_COLOR,
        kind: "line",
        data: smaFromBars(bars, 25),
      },
    ],
  },
  {
    id: "ema:12",
    name: "EMA(12)",
    aliases: ["ema12", "指数均线", "exponential moving average"],
    category: "trend",
    pane: "overlay",
    description: "12-period exponential moving average.",
    compute: (bars) => [
      {
        key: "line",
        label: "EMA(12)",
        color: EMA12_COLOR,
        kind: "line",
        data: emaFromBars(bars, 12),
      },
    ],
  },
  {
    id: "rsi:14",
    name: "RSI(14)",
    aliases: ["rsi", "相对强弱", "relative strength"],
    category: "momentum",
    pane: "sub",
    description: "14-period RSI — matches strategy / market-monitor.",
    compute: (bars) => [
      {
        key: "line",
        label: "RSI(14)",
        color: RSI_COLOR,
        kind: "line",
        data: rsiFromBars(bars, 14),
      },
    ],
  },
  {
    id: "macd:12,26,9",
    name: "MACD(12,26,9)",
    aliases: ["macd", "平滑异同", "golden cross", "death cross"],
    category: "momentum",
    pane: "sub",
    description: "MACD line, signal, and histogram.",
    compute: (bars) => {
      const { macd, signal, histogram } = macdFromBars(bars, 12, 26, 9);
      return [
        {
          key: "macd",
          label: "MACD",
          color: MACD_LINE_COLOR,
          kind: "line",
          data: macd,
        },
        {
          key: "signal",
          label: "Signal",
          color: MACD_SIGNAL_COLOR,
          kind: "line",
          data: signal,
        },
        {
          key: "hist",
          label: "Hist",
          color: MACD_HIST_UP,
          kind: "histogram",
          data: histogram,
        },
      ];
    },
  },
  {
    id: "boll:20,2",
    name: "BOLL(20,2)",
    aliases: ["boll", "bollinger", "布林带", "bands"],
    category: "volatility",
    pane: "overlay",
    description: "Bollinger Bands — 20 SMA ± 2σ.",
    compute: (bars) => {
      const { upper, middle, lower } = bollingerFromBars(bars, 20, 2);
      return [
        { key: "upper", label: "Upper", color: BOLL_UPPER, kind: "line", data: upper },
        { key: "middle", label: "Mid", color: BOLL_MIDDLE, kind: "line", data: middle },
        { key: "lower", label: "Lower", color: BOLL_LOWER, kind: "line", data: lower },
      ];
    },
  },
];

const REGISTRY_MAP = new Map<IndicatorId, IndicatorDefinition>(
  INDICATOR_DEFINITIONS.map((def) => [def.id, def]),
);

export function getIndicatorDefinition(id: IndicatorId): IndicatorDefinition | undefined {
  return REGISTRY_MAP.get(id);
}

export function listIndicatorDefinitions(): IndicatorDefinition[] {
  return INDICATOR_DEFINITIONS;
}

export function isIndicatorId(value: string): value is IndicatorId {
  return REGISTRY_MAP.has(value as IndicatorId);
}

export function filterIndicatorDefinitions(query: string): IndicatorDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return INDICATOR_DEFINITIONS;
  }
  return INDICATOR_DEFINITIONS.filter((def) => {
    if (def.id.toLowerCase().includes(q)) return true;
    if (def.name.toLowerCase().includes(q)) return true;
    if (def.category.toLowerCase().includes(q)) return true;
    return def.aliases.some((alias) => alias.toLowerCase().includes(q));
  });
}

export function computeIndicator(
  id: IndicatorId,
  bars: OhlcBar[],
): ComputedIndicatorSeries[] {
  const def = REGISTRY_MAP.get(id);
  if (!def || bars.length === 0) {
    return [];
  }
  return def.compute(bars);
}

export function countByPane(ids: IndicatorId[]): { overlay: number; sub: number } {
  let overlay = 0;
  let sub = 0;
  for (const id of ids) {
    const def = REGISTRY_MAP.get(id);
    if (!def) continue;
    if (def.pane === "overlay") overlay += 1;
    else sub += 1;
  }
  return { overlay, sub };
}

export function canAddIndicator(
  selected: IndicatorId[],
  candidate: IndicatorId,
  maxSub: number,
): boolean {
  if (selected.includes(candidate)) {
    return true;
  }
  const def = REGISTRY_MAP.get(candidate);
  if (!def) {
    return false;
  }
  const counts = countByPane(selected);
  if (def.pane === "overlay" && counts.overlay >= MAX_OVERLAY_INDICATORS) {
    return false;
  }
  if (def.pane === "sub" && counts.sub >= maxSub) {
    return false;
  }
  return true;
}

export function sanitizeIndicatorSelection(
  raw: string[],
  maxSub: number,
): IndicatorId[] {
  const out: IndicatorId[] = [];
  for (const item of raw) {
    if (!isIndicatorId(item)) continue;
    if (canAddIndicator(out, item, maxSub)) {
      out.push(item);
    }
  }
  return out;
}

export function macdHistogramColor(value: number): string {
  return value >= 0 ? MACD_HIST_UP : MACD_HIST_DOWN;
}

import type { UTCTimestamp } from "lightweight-charts";

export type IndicatorId =
  | "sma:7"
  | "sma:20"
  | "sma:25"
  | "ema:12"
  | "rsi:14"
  | "macd:12,26,9"
  | "boll:20,2";

export type IndicatorCategory = "trend" | "momentum" | "volatility";
export type IndicatorPane = "overlay" | "sub";

export type OhlcBar = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorPoint = {
  time: UTCTimestamp;
  value: number;
};

export type IndicatorSeriesKind = "line" | "histogram";

export type ComputedIndicatorSeries = {
  key: string;
  label: string;
  color: string;
  kind: IndicatorSeriesKind;
  data: IndicatorPoint[];
};

export type IndicatorDefinition = {
  id: IndicatorId;
  name: string;
  aliases: string[];
  category: IndicatorCategory;
  pane: IndicatorPane;
  /** Fixed params for MVP — aligned with strategy / market-monitor. */
  description: string;
  compute: (bars: OhlcBar[]) => ComputedIndicatorSeries[];
};

export type IndicatorLegendEntry = {
  id: IndicatorId;
  label: string;
  color: string;
  value: number | undefined;
};

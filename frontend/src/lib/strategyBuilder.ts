/**
 * Strategy builder helpers — Epic 2 rule rows → ParsedStrategyLayers
 */

import type {
  ParsedStrategyLayers,
  Philosophy,
  SignalAction,
  SignalRule,
  SignalRuleRow,
  SupportedIndicator,
} from "@/types/strategy";

export const PHILOSOPHY_OPTIONS: { value: Philosophy; label: string }[] = [
  { value: "trend_following", label: "趋势跟踪" },
  { value: "contrarian", label: "逆向抄底" },
  { value: "intuition_driven", label: "直觉驱动" },
  { value: "grid", label: "网格交易" },
  { value: "custom", label: "自定义" },
];

export interface StrategyTemplateDefinition {
  id: string;
  name: string;
  description: string;
  philosophy: Philosophy;
  rules: Omit<SignalRule, "weight">[];
  positionPct?: number;
  stopLossPct?: number;
}

export const CONDITION_OPTIONS: Record<
  SupportedIndicator,
  { value: string; label: string; needsThreshold: boolean }[]
> = {
  RSI: [
    { value: "< 30", label: "低于 30", needsThreshold: true },
    { value: "> 70", label: "高于 70", needsThreshold: true },
    { value: "< 40", label: "低于 40", needsThreshold: true },
    { value: "> 60", label: "高于 60", needsThreshold: true },
  ],
  MA20: [
    { value: "cross_above", label: "上穿 MA20", needsThreshold: false },
    { value: "cross_below", label: "下穿 MA20", needsThreshold: false },
  ],
  MACD: [
    { value: "golden_cross", label: "金叉", needsThreshold: false },
    { value: "death_cross", label: "死叉", needsThreshold: false },
  ],
  PRICE: [
    { value: "> 0", label: "高于价格", needsThreshold: true },
    { value: "< 0", label: "低于价格", needsThreshold: true },
  ],
};

export const STRATEGY_TEMPLATES: StrategyTemplateDefinition[] = [
  {
    id: "trend-scout",
    name: "Trend Scout",
    description: "Follow momentum with MA confirmation.",
    philosophy: "trend_following",
    rules: [
      { indicator: "MA20", condition: "cross_above", action: "BUY" },
      { indicator: "MA20", condition: "cross_below", action: "SELL" },
    ],
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    description: "Buy oversold, sell overbought RSI swings.",
    philosophy: "contrarian",
    rules: [
      { indicator: "RSI", condition: "< 30", threshold: 30, action: "BUY" },
      { indicator: "RSI", condition: "> 70", threshold: 70, action: "SELL" },
    ],
  },
  {
    id: "cautious-learner",
    name: "Cautious Learner",
    description: "Small entries with tight risk for first practice.",
    philosophy: "trend_following",
    positionPct: 0.05,
    stopLossPct: 0.03,
    rules: [
      { indicator: "RSI", condition: "< 35", threshold: 35, action: "BUY" },
      { indicator: "RSI", condition: "> 65", threshold: 65, action: "SELL" },
    ],
  },
  {
    id: "macd",
    name: "MACD Pulse",
    description: "MACD cross trend template.",
    philosophy: "trend_following",
    rules: [
      { indicator: "MACD", condition: "golden_cross", action: "BUY" },
      { indicator: "MACD", condition: "death_cross", action: "SELL" },
    ],
  },
];

export function newRuleRow(partial?: Partial<SignalRuleRow>): SignalRuleRow {
  return {
    id: crypto.randomUUID(),
    indicator: "RSI",
    condition: "< 30",
    threshold: 30,
    action: "BUY",
    ...partial,
  };
}

export function rulePreviewText(row: SignalRuleRow): string {
  const cond =
    CONDITION_OPTIONS[row.indicator].find((c) => c.value === row.condition)?.label ??
    row.condition;
  const action = row.action === "BUY" ? "Buy" : "Sell";
  return `${row.indicator} ${cond} → ${action}`;
}

export function rowsToSignalRules(rows: SignalRuleRow[]): SignalRule[] {
  return rows.map(({ indicator, condition, threshold, action }) => ({
    indicator,
    condition,
    ...(threshold !== undefined ? { threshold } : {}),
    action,
  }));
}

export function buildParsedStrategy(params: {
  philosophy: Philosophy;
  rules: SignalRuleRow[];
  positionPct: number;
  stopLossPct: number;
  takeProfitPct: number;
  maxDrawdownPct: number;
  targetPairs?: string[];
}): ParsedStrategyLayers {
  return {
    philosophy: params.philosophy,
    position_sizing: {
      type: "fixed",
      value: params.positionPct,
      scale_in: false,
    },
    signal_rules: rowsToSignalRules(params.rules),
    risk_management: {
      stop_loss_pct: params.stopLossPct,
      take_profit_pct: params.takeProfitPct,
      max_drawdown_pct: params.maxDrawdownPct,
    },
    ...(params.targetPairs?.length ? { target_pairs: params.targetPairs } : {}),
  };
}

export function parsedToRows(parsed: ParsedStrategyLayers): SignalRuleRow[] {
  return parsed.signal_rules.map((r) =>
    newRuleRow({
      indicator: r.indicator,
      condition: r.condition,
      threshold: r.threshold,
      action: r.action,
    }),
  );
}

export function clientValidateRows(rows: SignalRuleRow[]): string[] {
  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("至少添加 1 条规则");
  }
  if (rows.length > 8) {
    errors.push("最多 8 条规则");
  }
  rows.forEach((row, index) => {
    const opts = CONDITION_OPTIONS[row.indicator];
    const cond = opts.find((c) => c.value === row.condition);
    if (cond?.needsThreshold && (row.threshold === undefined || row.threshold <= 0)) {
      errors.push(`规则 ${index + 1}：请填写阈值`);
    }
  });
  return errors;
}

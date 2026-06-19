/**
 * English playbook labels and card-readable rule summaries.
 */

import type { ParsedStrategyLayers, Philosophy, SignalRule } from "@/types/strategy";

export const PHILOSOPHY_LABEL_EN: Record<Philosophy, string> = {
  trend_following: "Trend",
  contrarian: "Reversal",
  intuition_driven: "Intuition",
  grid: "Range",
  custom: "Custom",
};

function formatCondition(rule: SignalRule): string {
  const threshold =
    rule.threshold != null && !rule.condition.includes(String(rule.threshold))
      ? ` ${rule.threshold}`
      : "";
  return `${rule.condition}${threshold}`.trim();
}

export function formatRuleLine(rule: SignalRule): string {
  return `${rule.action} when ${rule.indicator} ${formatCondition(rule)}`;
}

export function summarizePlaybookRules(parsed: ParsedStrategyLayers, limit = 3): string[] {
  return parsed.signal_rules.slice(0, limit).map(formatRuleLine);
}

export function playbookStyleLabel(philosophy: Philosophy): string {
  return PHILOSOPHY_LABEL_EN[philosophy] ?? philosophy;
}

export function playbookCardSubtitle(parsed: ParsedStrategyLayers): string {
  const style = playbookStyleLabel(parsed.philosophy);
  const indicators = Array.from(new Set(parsed.signal_rules.map((r) => r.indicator)));
  if (indicators.length === 0) return style;
  return `${style} · ${indicators.join(" + ")}`;
}

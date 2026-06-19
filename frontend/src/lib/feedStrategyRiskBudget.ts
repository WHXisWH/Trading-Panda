import type { ParsedStrategyLayers, PolicyConflictDetail } from "@/types/strategy";

export function readPositionPct(parsed: ParsedStrategyLayers): number {
  return parsed.position_sizing.value ?? parsed.position_sizing.max_position_pct ?? 0.1;
}

export function orderSizeUsd(parsed: ParsedStrategyLayers, budget: number): number {
  return Math.round(budget * readPositionPct(parsed));
}

export function applyOrderSizeUsd(
  parsed: ParsedStrategyLayers,
  budget: number,
  usd: number,
): ParsedStrategyLayers {
  const safeUsd = Number.isFinite(usd) ? Math.max(0, usd) : 0;
  const pct = budget > 0 ? Math.min(1, safeUsd / budget) : 0;
  return {
    ...parsed,
    position_sizing: {
      ...parsed.position_sizing,
      type: parsed.position_sizing.type ?? "fixed",
      value: pct,
    },
  };
}

export function isOrderSizeCompatible(
  parsed: ParsedStrategyLayers,
  budget: number,
  maxNotionalPerTrade?: number | null,
  blockedPairs: string[] = [],
): boolean {
  if (blockedPairs.length > 0) return false;
  return !isNotionalOverLimit(orderSizeUsd(parsed, budget), maxNotionalPerTrade);
}

/** @deprecated Use isOrderSizeCompatible */
export function isRiskBudgetCompatible(
  parsed: ParsedStrategyLayers,
  budget: number,
  maxNotionalPerTrade?: number | null,
  _maxDailyLossCap?: number | null,
  blockedPairs: string[] = [],
): boolean {
  return isOrderSizeCompatible(parsed, budget, maxNotionalPerTrade, blockedPairs);
}

export function parseRiskUsdInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function riskFieldConflicts(conflicts?: PolicyConflictDetail[]) {
  return {
    notional: conflicts?.some((conflict) => conflict.code === "POLICY_NOTIONAL_EXCEEDED") ?? false,
  };
}

export function isNotionalOverLimit(orderUsd: number, maxNotional: number | null | undefined): boolean {
  if (maxNotional == null) return false;
  return orderUsd > maxNotional;
}

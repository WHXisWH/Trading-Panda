export const STRATEGY_PAGE_TEMPLATE_IDS = ["trend-scout", "mean-reversion", "macd"] as const;

export function canOpenTraining(strategyIsActive: boolean, feedSucceeded: boolean): boolean {
  return strategyIsActive || feedSucceeded;
}


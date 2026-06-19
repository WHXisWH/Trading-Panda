import { describe, expect, it } from "vitest";
import { canOpenTraining, STRATEGY_PAGE_TEMPLATE_IDS } from "./strategyPage";

describe("strategyPage", () => {
  it("limits the strategy page to the three beginner templates", () => {
    expect(STRATEGY_PAGE_TEMPLATE_IDS).toEqual([
      "trend-scout",
      "mean-reversion",
      "macd",
    ]);
  });

  it("only opens Training after strategy activation or a successful feed", () => {
    expect(canOpenTraining(false, false)).toBe(false);
    expect(canOpenTraining(false, true)).toBe(true);
    expect(canOpenTraining(true, false)).toBe(true);
  });
});


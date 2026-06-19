import { describe, expect, it } from "vitest";
import { hasActiveStrategy } from "./hasActiveStrategy";

describe("hasActiveStrategy", () => {
  it("returns true when active_strategy_id is set", () => {
    expect(
      hasActiveStrategy({
        active_strategy_id: "strategy-1",
        current_strategy: null,
      }),
    ).toBe(true);
  });

  it("returns true when only current_strategy is present", () => {
    expect(
      hasActiveStrategy({
        active_strategy_id: null,
        current_strategy: { philosophy: "trend_following", proficiency: 10 },
      }),
    ).toBe(true);
  });

  it("returns false when neither field is set", () => {
    expect(
      hasActiveStrategy({
        active_strategy_id: null,
        current_strategy: null,
      }),
    ).toBe(false);
  });
});

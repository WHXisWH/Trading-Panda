import { describe, expect, it } from "vitest";
import { buildStrategyPromptTemplates } from "./strategyPromptTemplates";

describe("buildStrategyPromptTemplates", () => {
  it("returns empty list when no active pair", () => {
    expect(buildStrategyPromptTemplates("")).toEqual([]);
  });

  it("scopes prompts to the active chart pool", () => {
    const templates = buildStrategyPromptTemplates("DEEP-SUI");
    expect(templates).toHaveLength(4);
    expect(templates.every((item) => item.prompt.includes("DEEP/SUI"))).toBe(true);
    expect(templates.every((item) => !item.prompt.includes("SUI/USDC"))).toBe(true);
  });

  it("updates when the active pool changes", () => {
    const deep = buildStrategyPromptTemplates("DEEP-SUI");
    const sui = buildStrategyPromptTemplates("SUI-USDC");
    expect(deep[0]?.label).toContain("DEEP");
    expect(sui[0]?.label).toContain("SUI");
    expect(sui.every((item) => item.prompt.includes("SUI/USDC"))).toBe(true);
  });

  it("uses BTC washout when the active pool includes BTC", () => {
    const templates = buildStrategyPromptTemplates("BTC-USDC");
    expect(templates.some((item) => item.id === "btc-stabilize")).toBe(true);
    expect(templates.some((item) => item.id === "cautious")).toBe(false);
  });
});

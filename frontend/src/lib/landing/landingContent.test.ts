import { describe, expect, it } from "vitest";
import {
  HERO_COPY,
  LANDING_SECTION_IDS,
  PANDA_HERO_ARCHETYPES,
  SUI_NATIVE_COPY,
  SUI_NATIVE_EVIDENCE_CHAIN,
  SUI_NATIVE_PAIRS,
  TRAINING_LOOP,
  WHY_CHECKLIST,
  WHY_COPY,
  WHY_DEMO,
} from "./landingContent";

describe("landing content", () => {
  it("keeps the agreed landing section order", () => {
    expect(LANDING_SECTION_IDS).toEqual([
      "hero",
      "why",
      "how-it-works",
      "sui-native",
      "safety",
      "training-loop",
      "cta",
    ]);
  });

  it("uses the bounded autonomous wallet hero promise", () => {
    expect(HERO_COPY.eyebrow).toBe("Sui-native autonomous agent wallet");
    expect(HERO_COPY.title).toBe(
      "Train a Panda that trades autonomously inside your rules.",
    );
    expect(HERO_COPY.subtitle).toContain("TradingPolicy");
    expect(HERO_COPY.subtitle).toContain("evidence trail");
  });

  it("shows only public-facing Panda archetypes in the hero", () => {
    expect(PANDA_HERO_ARCHETYPES.map((panda) => panda.name)).toEqual([
      "Balanced Scout",
      "Bold Veteran",
      "Patient Master",
      "Contrarian Mind",
    ]);
    expect(PANDA_HERO_ARCHETYPES.map((panda) => panda.id)).not.toContain(
      "panic-test",
    );
    expect(PANDA_HERO_ARCHETYPES.map((panda) => panda.id)).not.toContain(
      "boundary",
    );
  });

  it("frames learning as an evidence loop", () => {
    expect(TRAINING_LOOP).toEqual([
      "Market signal",
      "Panda decision",
      "Policy gate",
      "Vault execution",
      "Trade Fact",
      "Review",
      "Skill Memory",
    ]);
  });

  it("frames sui-native as paired sign vs enforce rows with evidence chain", () => {
    expect(SUI_NATIVE_COPY.controlLabel).toBe("You sign");
    expect(SUI_NATIVE_COPY.enforceLabel).toBe("Move enforces");
    expect(SUI_NATIVE_PAIRS).toHaveLength(4);
    expect(SUI_NATIVE_PAIRS[0]?.object).toBe("Panda NFT");
    expect(SUI_NATIVE_PAIRS[0]?.enforce.modules[0]).toBe("panda::Panda");
    expect(SUI_NATIVE_PAIRS[2]?.object).toBe("Bind authorized signer address");
    expect(SUI_NATIVE_PAIRS[3]?.object).toBe("Pause or revoke");
    expect(SUI_NATIVE_PAIRS[3]?.title).toBe("Reclaim control anytime");
    expect(SUI_NATIVE_PAIRS[2]?.enforce.modules).toContain(
      "agent_wallet::setup_agent_wallet",
    );
    expect(
      SUI_NATIVE_PAIRS[2]?.enforce &&
        "onChainField" in SUI_NATIVE_PAIRS[2].enforce &&
        SUI_NATIVE_PAIRS[2].enforce.onChainField?.name,
    ).toBe("authorized_agent");
    expect(SUI_NATIVE_EVIDENCE_CHAIN.steps).toContain("Trade Fact");
    expect(SUI_NATIVE_EVIDENCE_CHAIN.footnote).toContain("Chain Proof");
  });

  it("frames why as empathy headline, checklist, and contrast demo tabs", () => {
    expect(WHY_COPY.headline.highlightA).toBe("YOUR PANDA");
    expect(WHY_COPY.painQuestion.highlight).toBe("black box");
    expect(WHY_COPY.description).toContain("training a partner");
    expect(WHY_CHECKLIST).toHaveLength(3);
    expect(WHY_DEMO.tabs).toEqual({
      blindTrust: "Blind trust",
      yourPanda: "Your Panda",
    });
    expect(WHY_DEMO.yourPanda.badges).toEqual({
      boundedAutonomy: "Bounded autonomy",
      rulesYouOwn: "Rules you own",
    });
    expect(WHY_DEMO.yourPanda.trainingFootnote).toContain("live trading opens");
  });
});

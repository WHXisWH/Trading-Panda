import { PANDA_LAB_PRESETS } from "@/lib/pandaLabPresets";
import type { PandaLabPreset } from "@/lib/pandaLabPresets";

export const LANDING_SECTION_IDS = [
  "hero",
  "why",
  "how-it-works",
  "sui-native",
  "safety",
  "training-loop",
  "cta",
] as const;

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

export interface PandaArchetype {
  id: "balanced" | "bold-mature" | "patient-calm" | "contrarian";
  name: string;
  tags: string;
  tone: "steady" | "bold" | "patient" | "contrarian";
  preset: PandaLabPreset;
}

const PRESET_BY_ID = new Map(
  PANDA_LAB_PRESETS.map((preset) => [preset.id, preset]),
);

function requiredPreset(id: PandaArchetype["id"]): PandaLabPreset {
  const preset = PRESET_BY_ID.get(id);
  if (!preset) {
    throw new Error(`Missing Panda Lab preset: ${id}`);
  }
  return preset;
}

export const PANDA_HERO_ARCHETYPES: PandaArchetype[] = [
  {
    id: "balanced",
    name: "Balanced Scout",
    tags: "Even temperament · steady learner",
    tone: "steady",
    preset: requiredPreset("balanced"),
  },
  {
    id: "bold-mature",
    name: "Bold Veteran",
    tags: "High boldness · decisive entries",
    tone: "bold",
    preset: requiredPreset("bold-mature"),
  },
  {
    id: "patient-calm",
    name: "Patient Master",
    tags: "High patience · risk-aware timing",
    tone: "patient",
    preset: requiredPreset("patient-calm"),
  },
  {
    id: "contrarian",
    name: "Contrarian Mind",
    tags: "High contrarian · crowd-fade instinct",
    tone: "contrarian",
    preset: requiredPreset("contrarian"),
  },
];

export const HERO_COPY = {
  eyebrow: "Sui-native autonomous agent wallet",
  title: "Train a Panda that trades autonomously inside your rules.",
  subtitle:
    "Mint a Panda NFT, give it a Move-enforced TradingPolicy, and let it learn from real DeepBook market data. Every autonomous trade runs through your on-chain rules and leaves an evidence trail.",
  primaryCta: "Mint your Panda",
  secondaryCta: "See how it works",
};

export const WHY_PANDA = PANDA_HERO_ARCHETYPES[0];

export const WHY_COPY = {
  eyebrow: "Why TradingPanda",
  headline: {
    before: "Train",
    highlightA: "YOUR PANDA",
    middle: "with",
    highlightB: "BOUNDED",
    tail: "autonomy—rules you own.",
  },
  painQuestion: {
    before: "Still staring at charts or trusting a",
    highlight: "black box",
    after: "?",
  },
  description:
    "Autonomous trading should feel like training a partner—not surrendering your keys or quitting your sleep.",
  cta: "Mint your first Panda",
} as const;

export const WHY_CHECKLIST = [
  {
    title: "On-chain rules",
    body: "Size caps, loss limits, allowed pairs—Move blocks bad actions at the gate.",
  },
  {
    title: "Review every decision",
    body: "Trade Facts show the signal, policy check, and outcome—no guessing.",
  },
  {
    title: "It keeps learning",
    body: "Reviewed trades become Skill Memory. Your Panda gets sharper over time.",
  },
] as const;

export const WHY_DEMO = {
  tabs: {
    blindTrust: "Blind trust",
    yourPanda: "Your Panda",
  },
  blindTrust: {
    alert: "UNBOUNDED AGENT",
    modeLabel: "Mode",
    modeValue: "BLIND TRUST",
    rows: [
      { label: "Scope:", value: "Full wallet", tone: "bad" as const },
      { label: "Policy check:", value: "Hidden", tone: "bad" as const },
      { label: "Max per trade:", value: "—", tone: "neutral" as const },
      { label: "Audit trail:", value: "None", tone: "bad" as const },
      {
        label: "Last action:",
        value: "BUY $12,400 · no preview",
        tone: "bad" as const,
      },
    ],
  },
  yourPanda: {
    alert: "POLICY GATE PASSED",
    badges: {
      boundedAutonomy: "Bounded autonomy",
      rulesYouOwn: "Rules you own",
    },
    rows: [
      { label: "Scope:", value: "PandaVault only", tone: "good" as const },
      {
        label: "Policy check:",
        value: "PASSED · max $500/trade",
        tone: "good" as const,
      },
      {
        label: "Audit trail:",
        value: "Trade Fact #1847",
        tone: "good" as const,
      },
      {
        label: "Last action:",
        value: "HOLD · Skill Memory +1",
        tone: "neutral" as const,
      },
    ],
    trainingFootnote:
      "Real DeepBook data, zero capital at risk. Same policy rules—train here until live trading opens.",
  },
} as const;

export const HOW_STEPS = [
  {
    title: "Mint the agent identity",
    body: "Your Panda NFT anchors personality, ownership, and agent identity on Sui.",
    object: "Panda NFT",
  },
  {
    title: "Set the rules",
    body: "Create a TradingPolicy and PandaVault so the Panda can act only within your limits.",
    object: "TradingPolicy",
  },
  {
    title: "Train on real market data",
    body: "The Panda learns from DeepBook market movement instead of synthetic toy charts.",
    object: "DeepBook",
  },
  {
    title: "Let it act within the vault",
    body: "The Panda watches markets, decides when to act, and routes every trade through the PandaVault and TradingPolicy you created.",
    object: "PandaVault",
  },
  {
    title: "Review the evidence",
    body: "Decisions become Trade Facts so you can inspect signals, policy checks, execution, and outcomes.",
    object: "Trade Fact",
  },
  {
    title: "Improve the instinct",
    body: "Reviewed outcomes become Skill Memory that shapes future decisions.",
    object: "Skill Memory",
  },
] as const;

export const SUI_NATIVE_COPY = {
  eyebrow: "Move-enforced agent boundaries",
  title: "You sign the rules. Sui Move enforces them.",
  description:
    'TradingPanda is not "trust our backend." Panda NFT, PandaVault, and TradingPolicy are Sui objects with explicit owners. Every autonomous decision passes a policy gate and becomes a Trade Fact you can inspect—or prove on-chain when it matters.',
  chips: [
    "Owner-signed setup",
    "On-chain revert",
    "Inspectable Trade Facts",
  ],
  controlLabel: "You sign",
  enforceLabel: "Move enforces",
} as const;

export const SUI_NATIVE_PAIRS = [
  {
    object: "Panda NFT",
    title: "Mint agent identity",
    summary:
      "Personality and ownership anchor to a Sui object—not off-chain metadata you can rewrite later.",
    enforce: {
      modules: ["panda::Panda"],
      title: "On-chain identity",
      description:
        "Mint-time traits and ownership are part of the object model, not a backend profile.",
    },
  },
  {
    object: "PandaVault + TradingPolicy",
    title: "Fund vault and set limits",
    summary:
      "You sign pairs, size caps, loss limits, and expiry—the risk collar the Panda must obey.",
    enforce: {
      modules: ["panda_vault::PandaVault", "trading_policy::TradingPolicy"],
      title: "Out-of-bounds revert",
      description:
        "Disallowed pairs, oversize notionals, and expired policy abort on-chain; spends stay inside the vault.",
    },
  },
  {
    object: "Bind authorized signer address",
    title: "Dedicated signer, not your wallet",
    summary:
      "Your setup PTB writes authorized_agent into TradingPolicy—a separate address from your owner wallet. MVP binds one environment testnet signer at setup.",
    enforce: {
      modules: ["agent_wallet::setup_agent_wallet", "trading_policy::TradingPolicy"],
      onChainField: {
        name: "authorized_agent",
        value: "0x79ff…8741",
      },
      title: "Signer-only execution",
      description:
        "assert_agent requires sender == authorized_agent. Only that bound address can submit bounded agent PTBs.",
    },
  },
  {
    object: "Pause or revoke",
    title: "Reclaim control anytime",
    summary:
      "Pause blocks new autonomous paths. Revoke clears authorized_agent on-chain—only your owner signature, not a backend toggle.",
    enforce: {
      modules: ["trading_policy::TradingPolicy"],
      onChainField: {
        name: "authorized_agent",
        value: "0x0",
      },
      title: "Owner kill switch",
      description:
        "pause_policy sets paused on-chain. revoke_agent clears authorized_agent, sets agent_revoked, and blocks new agent paths.",
    },
  },
] as const;

export const SUI_NATIVE_EVIDENCE_CHAIN = {
  eyebrow: "Evidence chain",
  steps: [
    "DeepBook signal",
    "Panda intent",
    "Policy gate",
    "Training Ledger outcome",
    "Trade Fact",
    "Review",
    "Skill Memory",
    "On-chain digests",
  ],
  footnote:
    "Mode 1 trains on mainnet-priced paper execution. Mode 2 submits selected Trade Facts as testnet Chain Proof PTBs—proof of autonomous Sui action, not proof of every virtual fill.",
} as const;

export const TRAINING_LOOP = [
  "Market signal",
  "Panda decision",
  "Policy gate",
  "Vault execution",
  "Trade Fact",
  "Review",
  "Skill Memory",
] as const;

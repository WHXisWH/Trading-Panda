import { canonicalMarketPair } from "@/lib/market/canonicalMarketPair";

export interface StrategyPromptTemplate {
  id: string;
  label: string;
  scene: string;
  prompt: string;
}

function formatPairForPrompt(pair: string): string {
  return canonicalMarketPair(pair).replace(/-/g, "/");
}

function baseAsset(pair: string): string {
  return canonicalMarketPair(pair).split("-")[0] ?? pair;
}

/** Build crypto-scene starters for the active chart pool only. */
export function buildStrategyPromptTemplates(activePair: string): StrategyPromptTemplate[] {
  const pair = canonicalMarketPair(activePair);
  if (!pair) {
    return [];
  }

  const pairLabel = formatPairForPrompt(pair);
  const base = baseAsset(pair);

  const templates: StrategyPromptTemplate[] = [
    {
      id: "dip-buy",
      label: `${base} dip buy`,
      scene: `Buy the ${pairLabel} dip, sell the bounce`,
      prompt: `Buy on ${pairLabel} when price dips hard and sellers look exhausted. Sell on a strong bounce. Keep each trade under 10% size with a 5% stop loss.`,
    },
    {
      id: "momentum",
      label: `${base} momentum`,
      scene: `Ride clear uptrends on ${pairLabel}`,
      prompt: `Only buy ${pairLabel} when momentum is clearly up across several candles. Exit if the trend breaks. Use small size while I am still learning.`,
    },
    {
      id: "range",
      label: "Range ping-pong",
      scene: `Buy lows and sell highs on ${pairLabel}`,
      prompt: `Trade ${pairLabel} inside a range: buy near local lows, sell near local highs. Stay flat when the market is choppy and signals are unclear.`,
    },
  ];

  if (pair.toUpperCase().includes("BTC")) {
    templates.push({
      id: "btc-stabilize",
      label: "BTC washout",
      scene: `Wait for stabilization on ${pairLabel}`,
      prompt: `When ${pairLabel} dumps sharply, wait for stabilization before buying the rebound. Take profit on quick bounces and use a tight stop if the bounce fails.`,
    });
  } else {
    templates.push({
      id: "cautious",
      label: "Cautious learner",
      scene: `Small practice trades on ${pairLabel}`,
      prompt: `Use very small size on ${pairLabel} while learning. Buy only on clear signals, sell quickly on small wins, and stop out fast if the setup fails.`,
    });
  }

  return templates;
}

export function buildParseFailureHints(activePair: string): string[] {
  return buildStrategyPromptTemplates(activePair).map((item) => item.prompt);
}

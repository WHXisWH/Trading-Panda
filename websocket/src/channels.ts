/** Redis channel helpers — aligned with docs/redis-architecture.md §5 */

const ASSET_TO_PAIR: Record<string, string> = {
  BTC: "BTC-USDC",
  ETH: "ETH-USDC",
  SUI: "SUI-USDC",
};

const PANDA_SUFFIXES = ["decision", "emotion", "experience", "diary", "trade"] as const;

export function assetToPair(asset: string): string {
  const upper = asset.toUpperCase();
  return ASSET_TO_PAIR[upper] ?? `${upper}-USDC`;
}

export function pandaChannels(pandaId: string): string[] {
  return PANDA_SUFFIXES.map((suffix) => `panda:${pandaId}:${suffix}`);
}

export function marketTickChannel(pair: string): string {
  return `market:tick:${pair}`;
}

export function marketCandleChannel(pair: string, interval: string): string {
  return `market:candles:${interval}:${pair}`;
}

export function channelsForMarketSubscribe(
  assets: string[],
  pairs: string[],
  interval: string,
): string[] {
  const channels = new Set<string>();
  const tickPairs = [
    ...assets.map((asset) => assetToPair(asset)),
    ...pairs.map((pair) => pair.trim()).filter(Boolean),
  ];
  for (const pair of tickPairs) {
    channels.add(marketTickChannel(pair));
    if (interval === "1m") {
      channels.add(marketCandleChannel(pair, "1m"));
    }
  }
  return [...channels];
}

export function parsePandaIdFromChannel(channel: string): string | null {
  const match = /^panda:([^:]+):(decision|emotion|experience|diary|trade)$/.exec(channel);
  return match ? match[1] : null;
}

export function emptySubscriptions(): import("./types.js").SubscriptionState {
  return { pandas: {}, market: null };
}

export function collectRedisChannels(
  subscriptions: import("./types.js").SubscriptionState,
): string[] {
  const channels = new Set<string>();
  for (const pandaId of Object.keys(subscriptions.pandas)) {
    for (const ch of pandaChannels(pandaId)) {
      channels.add(ch);
    }
  }
  if (subscriptions.market) {
    for (const ch of channelsForMarketSubscribe(
      subscriptions.market.assets,
      subscriptions.market.pairs,
      subscriptions.market.interval,
    )) {
      channels.add(ch);
    }
  }
  return [...channels].sort();
}

function subscribedMarketChannelSet(
  subscriptions: import("./types.js").SubscriptionState,
): Set<string> {
  if (!subscriptions.market) {
    return new Set();
  }
  return new Set(
    channelsForMarketSubscribe(
      subscriptions.market.assets,
      subscriptions.market.pairs,
      subscriptions.market.interval,
    ),
  );
}

export function shouldForwardChannel(
  channel: string,
  subscriptions: import("./types.js").SubscriptionState,
): boolean {
  const pandaId = parsePandaIdFromChannel(channel);
  if (pandaId) {
    return pandaId in subscriptions.pandas;
  }
  if (channel.startsWith("market:tick:") || channel.startsWith("market:candles:")) {
    return subscribedMarketChannelSet(subscriptions).has(channel);
  }
  return false;
}

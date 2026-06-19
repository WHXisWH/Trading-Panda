import { describe, expect, it } from "vitest";
import {
  assetToPair,
  channelsForMarketSubscribe,
  collectRedisChannels,
  emptySubscriptions,
  pandaChannels,
  parsePandaIdFromChannel,
  shouldForwardChannel,
} from "../src/channels.js";

describe("channels", () => {
  it("maps assets to DeepBook pairs", () => {
    expect(assetToPair("SUI")).toBe("SUI-USDC");
    expect(assetToPair("btc")).toBe("BTC-USDC");
    expect(assetToPair("DOGE")).toBe("DOGE-USDC");
  });

  it("builds panda redis channels", () => {
    const channels = pandaChannels("pnd-1");
    expect(channels).toContain("panda:pnd-1:decision");
    expect(channels).toContain("panda:pnd-1:trade");
    expect(channels).toHaveLength(5);
  });

  it("collects channels from subscriptions", () => {
    const subs = emptySubscriptions();
    subs.pandas["pnd-1"] = { simulationId: "sim-1" };
    subs.market = { assets: ["SUI"], pairs: [], interval: "1m" };
    const channels = collectRedisChannels(subs);
    expect(channels).toContain("panda:pnd-1:emotion");
    expect(channels).toContain("market:tick:SUI-USDC");
    expect(channels).toContain("market:candles:1m:SUI-USDC");
  });

  it("parses panda id from channel", () => {
    expect(parsePandaIdFromChannel("panda:abc:decision")).toBe("abc");
    expect(parsePandaIdFromChannel("market:tick:SUI-USDC")).toBeNull();
  });

  it("filters forwarding by subscription", () => {
    const subs = emptySubscriptions();
    subs.pandas["pnd-1"] = {};
    expect(shouldForwardChannel("panda:pnd-1:decision", subs)).toBe(true);
    expect(shouldForwardChannel("panda:pnd-2:decision", subs)).toBe(false);
    subs.market = { assets: ["BTC"], pairs: [], interval: "5m" };
    expect(shouldForwardChannel("market:tick:BTC-USDC", subs)).toBe(true);
  });

  it("adds market tick only for non-1m intervals", () => {
    const channels = channelsForMarketSubscribe(["ETH"], [], "5m");
    expect(channels).toEqual(["market:tick:ETH-USDC"]);
  });

  it("subscribes explicit DeepBook pairs (canonical dashed suffix)", () => {
    const channels = channelsForMarketSubscribe([], ["DEEP-SUI"], "1m");
    expect(channels).toContain("market:tick:DEEP-SUI");
    expect(channels).toContain("market:candles:1m:DEEP-SUI");
  });

  it("forwards only subscribed market channels", () => {
    const subs = emptySubscriptions();
    subs.market = { assets: [], pairs: ["DEEP-SUI"], interval: "1m" };
    expect(shouldForwardChannel("market:tick:DEEP-SUI", subs)).toBe(true);
    expect(shouldForwardChannel("market:tick:DEEP/SUI", subs)).toBe(false);
    expect(shouldForwardChannel("market:tick:SUI-USDC", subs)).toBe(false);
  });
});

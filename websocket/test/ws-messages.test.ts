import { describe, expect, it } from "vitest";
import { normalizeRedisPayload, parseClientMessage } from "../src/ws-messages.js";

describe("ws-messages", () => {
  it("parses client commands", () => {
    const msg = parseClientMessage(
      JSON.stringify({
        command: "subscribe.simulation",
        payload: { panda_id: "p1", simulation_id: "s1" },
        request_id: "r1",
      }),
    );
    expect(msg?.command).toBe("subscribe.simulation");
    expect(msg?.payload.panda_id).toBe("p1");
  });

  it("rejects invalid client messages", () => {
    expect(parseClientMessage("not-json")).toBeNull();
    expect(parseClientMessage(JSON.stringify({ command: 1 }))).toBeNull();
  });

  it("forwards DE-shaped redis payloads", () => {
    const raw = JSON.stringify({
      event: "trade.executed",
      payload: { panda_id: "p1" },
      timestamp: "2026-05-09T00:00:00.000Z",
    });
    const event = normalizeRedisPayload("panda:p1:decision", raw);
    expect(event?.event).toBe("trade.executed");
  });

  it("wraps market monitor payloads", () => {
    const raw = JSON.stringify({ asset: "SUI", price: 1.2 });
    const event = normalizeRedisPayload("market:tick:SUI-USDC", raw);
    expect(event?.event).toBe("market.tick");
    expect((event?.payload as { asset: string }).asset).toBe("SUI");
  });
});

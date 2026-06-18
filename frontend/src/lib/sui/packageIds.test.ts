import { describe, expect, it } from "vitest";
import {
  eventTypeMatchesPackage,
  packageIdForMoveCall,
  packageIdsForEventMatch,
} from "@/lib/sui/packageIds";

describe("packageIds", () => {
  const original = "0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465";
  const published = "0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339";

  it("prefers published-at for move calls when configured", () => {
    process.env.NEXT_PUBLIC_PACKAGE_ID = original;
    process.env.NEXT_PUBLIC_PACKAGE_PUBLISHED_AT = published;
    expect(packageIdForMoveCall()).toBe(published);
  });

  it("matches events from either package generation", () => {
    process.env.NEXT_PUBLIC_PACKAGE_ID = original;
    process.env.NEXT_PUBLIC_PACKAGE_PUBLISHED_AT = published;
    expect(packageIdsForEventMatch()).toEqual([original, published]);
    expect(
      eventTypeMatchesPackage(`${published}::agent_wallet::PandaVaultCreated`),
    ).toBe(true);
    expect(eventTypeMatchesPackage(`${original}::panda::PandaMinted`)).toBe(true);
  });
});

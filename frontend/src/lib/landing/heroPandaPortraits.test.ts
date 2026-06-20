import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_HERO_PANDA_PORTRAIT,
  HERO_PANDA_PORTRAIT_PATHS,
  heroPandaPortraitPath,
} from "@/lib/landing/heroPandaPortraits";
import { PANDA_HERO_ARCHETYPES } from "@/lib/landing/landingContent";

const publicRoot = join(process.cwd(), "public");

describe("heroPandaPortraits", () => {
  it("maps every hero archetype to a portrait path", () => {
    expect(PANDA_HERO_ARCHETYPES.map((panda) => heroPandaPortraitPath(panda.id))).toEqual([
      HERO_PANDA_PORTRAIT_PATHS.balanced,
      HERO_PANDA_PORTRAIT_PATHS["bold-mature"],
      HERO_PANDA_PORTRAIT_PATHS["patient-calm"],
      HERO_PANDA_PORTRAIT_PATHS.contrarian,
    ]);
  });

  it("uses balanced as the default preload portrait", () => {
    expect(DEFAULT_HERO_PANDA_PORTRAIT).toBe("/assets/panda/hero/balanced.webp");
  });

  it("has baked portrait files on disk", () => {
    for (const path of Object.values(HERO_PANDA_PORTRAIT_PATHS)) {
      expect(existsSync(join(publicRoot, path.replace(/^\//, "")))).toBe(true);
    }
    expect(
      existsSync(join(publicRoot, "assets/panda/hero/how-it-works-mint.webp"))
    ).toBe(true);
  });
});

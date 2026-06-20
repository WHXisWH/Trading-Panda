#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PANDA_HERO_ARCHETYPES } from "../src/lib/landing/landingContent.ts";
import { HOW_IT_WORKS_MINT_PANDA_STATS } from "../src/lib/landing/howItWorksMintPreview.ts";
import { canvasAssetPaths } from "../src/lib/pandaCanvasAssets.ts";
import {
  PANDA_CANVAS_SIZE,
  renderPandaCanvas,
  type LoadedPandaImageMap,
} from "../src/lib/pandaCanvasDraw.ts";
import type { PandaStats } from "../src/utils/pandaHelper.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(scriptDir, "..");
const publicRoot = join(frontendRoot, "public");
const outputDir = join(publicRoot, "assets/panda/hero");

const HERO_RENDER_OPTIONS = {
  tierMode: "discrete" as const,
  traitOpacityMode: "solid" as const,
};

function publicPathFromAssetUrl(assetUrl: string): string {
  return join(publicRoot, assetUrl.replace(/^\//, ""));
}

async function loadAssetImages(assetUrls: string[]): Promise<LoadedPandaImageMap> {
  const images: LoadedPandaImageMap = {};
  await Promise.all(
    assetUrls.map(async (assetUrl) => {
      images[assetUrl] = await loadImage(publicPathFromAssetUrl(assetUrl));
    })
  );
  return images;
}

async function bakePortrait(id: string, stats: PandaStats, showBackground = true) {
  const assetUrls = canvasAssetPaths(stats, HERO_RENDER_OPTIONS);
  const images = await loadAssetImages(assetUrls);
  const canvas = createCanvas(PANDA_CANVAS_SIZE, PANDA_CANVAS_SIZE);

  renderPandaCanvas(canvas, images, stats, showBackground, HERO_RENDER_OPTIONS, undefined, {
    pixelRatio: 1,
  });

  const outputPath = join(outputDir, `${id}.webp`);
  writeFileSync(outputPath, canvas.toBuffer("image/webp"));
  console.log(`Wrote ${outputPath}`);
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  for (const archetype of PANDA_HERO_ARCHETYPES) {
    await bakePortrait(archetype.id, archetype.preset.stats);
  }

  await bakePortrait("how-it-works-mint", HOW_IT_WORKS_MINT_PANDA_STATS, false);

  console.log(`Baked ${PANDA_HERO_ARCHETYPES.length + 1} landing portraits.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import type { PandaArchetype } from "@/lib/landing/landingContent";

/** Pre-baked hero portraits for the landing page (see `pnpm panda:hero:bake`). */
export const HERO_PANDA_PORTRAIT_PATHS: Record<PandaArchetype["id"], string> = {
  balanced: "/assets/panda/hero/balanced.webp",
  "bold-mature": "/assets/panda/hero/bold-mature.webp",
  "patient-calm": "/assets/panda/hero/patient-calm.webp",
  contrarian: "/assets/panda/hero/contrarian.webp",
};

export const DEFAULT_HERO_PANDA_PORTRAIT = HERO_PANDA_PORTRAIT_PATHS.balanced;

export function heroPandaPortraitPath(id: PandaArchetype["id"]): string {
  return HERO_PANDA_PORTRAIT_PATHS[id];
}

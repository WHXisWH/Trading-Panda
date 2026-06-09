import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExperienceRigEditor } from "@/components/panda/rig/ExperienceRigEditor";
import { isPandaLabEnabled } from "@/lib/pandaLab";
import type { ExperienceRigManifest } from "@/lib/pandaExperienceRig";
import type { PandaSublayerPlacementManifest } from "@/lib/pandaSublayerPlacement";

export const metadata = {
  title: "Experience Rig 标注台 | TradingPanda",
  description: "内部资产生产工具：标注 Panda experience 底图 landmarks",
};

async function loadExperienceRigManifest(): Promise<
  ExperienceRigManifest | undefined
> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "panda",
    "experience-rig.json"
  );

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as ExperienceRigManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function loadSublayerPlacementManifest(): Promise<
  PandaSublayerPlacementManifest | undefined
> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "panda",
    "sublayer-placement.json"
  );

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PandaSublayerPlacementManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export default async function PandaRigRoute() {
  if (!isPandaLabEnabled()) {
    notFound();
  }

  const initialManifest = await loadExperienceRigManifest();
  const initialPlacementManifest = await loadSublayerPlacementManifest();

  return (
    <PageContainer variant="wide" className="py-8">
      <ExperienceRigEditor
        initialManifest={initialManifest}
        initialPlacementManifest={initialPlacementManifest}
      />
    </PageContainer>
  );
}

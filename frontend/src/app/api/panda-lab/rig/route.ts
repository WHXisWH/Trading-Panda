import { promises as fs } from "fs";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import {
  type ExperienceRigManifest,
  validateExperienceRigManifest,
} from "@/lib/pandaExperienceRig";

export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Rig manifest saving is only enabled in development." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validateExperienceRigManifest(body);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Invalid experience rig manifest.", details: validationErrors },
      { status: 400 }
    );
  }
  const manifest = body as ExperienceRigManifest;

  const filePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "panda",
    "experience-rig.json"
  );

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return NextResponse.json({ ok: true, path: "public/assets/panda/experience-rig.json" });
}

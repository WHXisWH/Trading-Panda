import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  return proxyBackend(req, {
    method: "POST",
    backendPath: `engine/actors/${params.id}/start`,
    body: {
      panda_id: params.id,
      simulation_id: crypto.randomUUID(),
      speed: (body as { speed?: string }).speed ?? "1x",
    },
    useInternalKey: true,
  });
}

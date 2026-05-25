import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyBackend(req, {
    method: "POST",
    backendPath: `engine/actors/${params.id}/stop`,
    body: { panda_id: params.id },
    useInternalKey: true,
  });
}

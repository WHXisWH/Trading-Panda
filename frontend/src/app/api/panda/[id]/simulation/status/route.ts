import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: `panda/${params.id}/simulation/status`,
  });
}

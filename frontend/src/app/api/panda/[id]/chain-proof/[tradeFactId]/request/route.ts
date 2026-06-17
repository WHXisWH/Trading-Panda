import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; tradeFactId: string } },
) {
  return proxyBackend(req, {
    method: "POST",
    backendPath: `panda/${params.id}/chain-proof/${params.tradeFactId}/request`,
  });
}

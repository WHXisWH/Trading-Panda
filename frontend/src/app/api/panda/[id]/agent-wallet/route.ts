import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyBackend(req, { backendPath: `panda/${id}/agent-wallet` });
}

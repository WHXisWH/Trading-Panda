import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

type RouteContext = { params: Promise<{ id: string; strategyId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { id, strategyId } = await context.params;
  return proxyBackend(req, {
    method: "POST",
    backendPath: `panda/${id}/strategy/${strategyId}/activate`,
    body: {},
  });
}

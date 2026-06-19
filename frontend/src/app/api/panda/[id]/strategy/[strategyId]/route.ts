import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

type RouteContext = { params: Promise<{ id: string; strategyId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, strategyId } = await context.params;
  const body = await req.json();
  return proxyBackend(req, {
    method: "PATCH",
    backendPath: `panda/${id}/strategy/${strategyId}`,
    body,
  });
}

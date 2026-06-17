import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  return proxyBackend(req, {
    method: "POST",
    backendPath: `panda/${id}/agent-wallet/validate-policy`,
    body,
  });
}

import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  return proxyBackend(req, {
    method: "GET",
    backendPath: `panda/${params.id}/training/order-intents?limit=${limit}`,
  });
}

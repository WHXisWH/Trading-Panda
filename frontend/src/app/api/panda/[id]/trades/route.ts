import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const url = new URL(req.url);
  const query = url.searchParams.toString();
  const suffix = query ? `?${query}` : "";
  return proxyBackend(req, {
    method: "GET",
    backendPath: `panda/${params.id}/trades${suffix}`,
  });
}

import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: `panda/${params.id}/pools`,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({}));
  return proxyBackend(req, {
    method: "PUT",
    backendPath: `panda/${params.id}/pools`,
    body,
  });
}

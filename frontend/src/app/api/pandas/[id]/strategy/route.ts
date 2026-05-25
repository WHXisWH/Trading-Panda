import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyBackend(req, { backendPath: `pandas/${params.id}/strategy` });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  return proxyBackend(req, {
    method: "POST",
    backendPath: `pandas/${params.id}/strategy`,
    body,
  });
}

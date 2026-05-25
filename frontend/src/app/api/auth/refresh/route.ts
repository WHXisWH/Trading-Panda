import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyBackend(req, {
    method: "POST",
    backendPath: "auth/refresh",
    body,
    forwardAuth: false,
  });
}

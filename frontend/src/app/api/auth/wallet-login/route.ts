import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** @deprecated Prefer POST /api/auth/connect — kept for backward compatibility */
export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyBackend(req, {
    method: "POST",
    backendPath: "auth/login",
    body,
    forwardAuth: false,
  });
}

import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return proxyBackend(req, {
    method: "POST",
    backendPath: "checkin",
    body,
  });
}

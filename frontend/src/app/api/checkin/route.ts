import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** Claim today's check-in (auth required). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return proxyBackend(req, {
    method: "POST",
    backendPath: "checkin",
    body,
  });
}

/** Current streak + recent history for the profile calendar (auth required). */
export async function GET(req: NextRequest) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: "checkin",
    forwardAuth: true,
  });
}

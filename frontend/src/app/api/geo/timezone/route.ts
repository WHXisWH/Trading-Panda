import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Edge-provided timezone from IP geolocation (Cloudflare / Vercel). */
export async function GET(req: NextRequest) {
  const timeZone =
    req.headers.get("cf-timezone") ??
    req.headers.get("x-vercel-ip-timezone") ??
    null;

  return NextResponse.json({
    timeZone,
    source: timeZone ? "edge" : "browser",
  });
}

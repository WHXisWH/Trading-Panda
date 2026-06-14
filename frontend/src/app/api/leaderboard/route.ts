import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** Public leaderboard — ?dimension=winrate|pnl|level&limit=N */
export async function GET(req: NextRequest) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: `leaderboard${req.nextUrl.search}`,
    forwardAuth: false,
  });
}

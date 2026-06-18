import type { NextRequest } from "next/server";
import { proxyMarketMonitor } from "@/lib/server/marketMonitorProxy";

/** BFF → market-monitor GET /pairs */
export async function GET(req: NextRequest) {
  return proxyMarketMonitor(req, "pairs");
}

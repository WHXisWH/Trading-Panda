import type { NextRequest } from "next/server";
import { proxyMarketMonitor } from "@/lib/server/marketMonitorProxy";

/** BFF → market-monitor GET /candles?pool=… */
export async function GET(req: NextRequest) {
  return proxyMarketMonitor(req, "candles");
}

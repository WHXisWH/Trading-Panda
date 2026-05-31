import type { NextRequest } from "next/server";
import { proxyMarketMonitor } from "@/lib/server/marketMonitorProxy";

export async function GET(req: NextRequest) {
  return proxyMarketMonitor(req, "health");
}

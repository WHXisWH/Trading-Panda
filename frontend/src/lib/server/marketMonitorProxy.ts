/**
 * BFF → market-monitor proxy (historical candles).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function getMarketMonitorBaseUrl(): string {
  return (
    process.env.MARKET_MONITOR_URL ??
    process.env.NEXT_PUBLIC_MARKET_MONITOR_URL ??
    "http://localhost:8001"
  ).replace(/\/$/, "");
}

export async function proxyMarketMonitor(
  req: NextRequest,
  monitorPath: string,
): Promise<NextResponse> {
  const base = getMarketMonitorBaseUrl();
  const path = monitorPath.replace(/^\//, "");
  const incoming = new URL(req.url);
  const target = new URL(`${base}/${path}`);
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const res = await fetch(target.toString(), {
      method: req.method,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market monitor unreachable";
    return NextResponse.json(
      { success: false, error: { code: "MARKET_MONITOR_UNAVAILABLE", message } },
      { status: 502 },
    );
  }
}

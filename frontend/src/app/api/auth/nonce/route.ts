import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet_address");
  const qs = wallet ? `?wallet_address=${encodeURIComponent(wallet)}` : "";
  return proxyBackend(req, {
    method: "GET",
    backendPath: `auth/nonce${qs}`,
    forwardAuth: false,
  });
}

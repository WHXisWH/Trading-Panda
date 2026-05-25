import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** GET /api/panda/my — list current user's pandas (proxies legacy GET /pandas) */
export async function GET(req: NextRequest) {
  return proxyBackend(req, { backendPath: "panda/my" });
}

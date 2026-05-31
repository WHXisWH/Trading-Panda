import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** Public DeepBook MVP pool catalog — no panda id required */
export async function GET(req: NextRequest) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: "market/pools",
    forwardAuth: false,
  });
}

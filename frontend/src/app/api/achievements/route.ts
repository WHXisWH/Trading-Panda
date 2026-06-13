import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** Current user's achievement catalog + unlock state (auth required). */
export async function GET(req: NextRequest) {
  return proxyBackend(req, {
    method: "GET",
    backendPath: "achievements",
    forwardAuth: true,
  });
}

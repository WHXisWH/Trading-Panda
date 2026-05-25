import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

export async function GET(req: NextRequest) {
  return proxyBackend(req, { backendPath: "auth/me" });
}

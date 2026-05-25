import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";

/** POST /api/panda/mint — register on-chain mint → PostgreSQL (BFF → backend /panda/mint) */
export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyBackend(req, {
    method: "POST",
    backendPath: "panda/mint",
    body,
  });
}

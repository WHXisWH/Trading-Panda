import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("authorization");
  const res = await fetch(`${BACKEND_URL}/engine/actors/${params.id}/stop`, {
    method: "POST",
    headers: { ...(auth ? { Authorization: auth } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

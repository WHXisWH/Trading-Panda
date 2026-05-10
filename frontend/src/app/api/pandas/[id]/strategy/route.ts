import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function authHeaders(req: NextRequest, json = true): Record<string, string> {
  const h: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
  const auth = req.headers.get("authorization");
  if (auth) h["Authorization"] = auth;
  return h;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/engine/strategy/parse`, {
    method: "POST",
    headers: authHeaders(req),
    body: JSON.stringify({ panda_id: params.id, raw_text: body.rawText }),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${BACKEND_URL}/pandas/${params.id}/strategy`, {
    headers: authHeaders(req, false),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

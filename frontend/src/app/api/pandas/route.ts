import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function authHeaders(req: NextRequest, json = true): Record<string, string> {
  const h: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
  const auth = req.headers.get("authorization");
  if (auth) h["Authorization"] = auth;
  return h;
}

export async function GET(req: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/pandas`, { headers: authHeaders(req, false) });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/pandas`, {
    method: "POST",
    headers: authHeaders(req),
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

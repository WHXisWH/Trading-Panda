import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const h: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) h["Authorization"] = auth;
  const res = await fetch(`${BACKEND_URL}/pandas/${params.id}`, { headers: h });
  return NextResponse.json(await res.json(), { status: res.status });
}

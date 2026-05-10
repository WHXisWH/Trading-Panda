// POST /api/checkin — daily check-in
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO: validate JWT, call backend, return reward
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}

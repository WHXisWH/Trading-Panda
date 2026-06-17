import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_SUI_NETWORK } from "@/lib/sui/network";

const PROVER_URLS: Record<string, string> = {
  testnet: "https://prover-testnet.mystenlabs.com/v1",
  mainnet: "https://prover.mystenlabs.com/v1",
  devnet: "https://prover-dev.mystenlabs.com/v1",
};

type ProofBody = {
  jwt?: string;
  extendedEphemeralPublicKey?: string;
  maxEpoch?: string;
  jwtRandomness?: string;
  salt?: string;
  keyClaimName?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ProofBody;

  if (
    !body.jwt ||
    !body.extendedEphemeralPublicKey ||
    !body.maxEpoch ||
    !body.jwtRandomness ||
    !body.salt ||
    body.keyClaimName !== "sub"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Invalid zkLogin proof request" },
      },
      { status: 400 },
    );
  }

  const proverUrl =
    process.env.ZKLOGIN_PROVER_URL ?? PROVER_URLS[APP_SUI_NETWORK] ?? PROVER_URLS.testnet;

  try {
    const upstream = await fetch(proverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await upstream.json()) as Record<string, unknown>;

    if (!upstream.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : typeof data.message === "string"
            ? data.message
            : "zkLogin prover rejected the request";
      return NextResponse.json(
        { success: false, error: { message } },
        { status: upstream.status },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "zkLogin prover unavailable";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 },
    );
  }
}

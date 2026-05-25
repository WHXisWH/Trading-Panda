import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/server/backendProxy";
import {
  verifyWalletLoginSignature,
  walletLoginMessage,
} from "@/lib/server/walletSignatureVerify";

type ConnectBody = {
  method?: string;
  wallet_address?: string;
  signature?: string;
  nonce?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ConnectBody;

  if (body.method === "wallet") {
    const wallet = body.wallet_address?.trim();
    const signature = body.signature;
    const nonce = body.nonce?.trim();

    if (!wallet || !signature || !nonce) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_MISSING_PARAMS",
            message: "wallet_address, signature, and nonce are required",
          },
        },
        { status: 400 },
      );
    }

    const message = walletLoginMessage(nonce);
    try {
      await verifyWalletLoginSignature(message, signature, wallet);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_INVALID_SIGNATURE",
            message: "Wallet signature does not match message",
          },
        },
        { status: 401 },
      );
    }

    return proxyBackend(req, {
      method: "POST",
      backendPath: "auth/connect",
      body,
      forwardAuth: false,
      useInternalKey: true,
      headers: { "X-BFF-Wallet-Verified": wallet },
    });
  }

  return proxyBackend(req, {
    method: "POST",
    backendPath: "auth/connect",
    body,
    forwardAuth: false,
  });
}

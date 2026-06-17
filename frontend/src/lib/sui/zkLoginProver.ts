import type { ZkLoginSignatureInputs } from "@mysten/sui/zklogin";

export type PartialZkLoginProof = Omit<ZkLoginSignatureInputs, "addressSeed">;

export interface ZkLoginProofRequest {
  jwt: string;
  extendedEphemeralPublicKey: string;
  maxEpoch: string;
  jwtRandomness: string;
  salt: string;
  keyClaimName: "sub";
}

export async function fetchZkLoginProof(
  payload: ZkLoginProofRequest,
): Promise<PartialZkLoginProof> {
  const res = await fetch("/api/auth/zklogin/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as {
    success?: boolean;
    data?: PartialZkLoginProof;
    error?: { message?: string };
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Failed to fetch zkLogin proof");
  }

  return json.data;
}

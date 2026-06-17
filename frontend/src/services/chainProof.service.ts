import type {
  ChainProofRequestResultApi,
  ChainProofStatusApi,
} from "@/types/autonomous-wallet";

const apiBase = () => "";

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok || body.success === false) {
    const message = body.error?.message ?? res.statusText;
    throw new Error(message);
  }
  return body.data as T;
}

export async function fetchChainProofStatus(
  jwt: string,
  pandaId: string,
  tradeFactId: string,
): Promise<ChainProofStatusApi> {
  const res = await fetch(
    `${apiBase()}/api/panda/${pandaId}/chain-proof/${tradeFactId}`,
    { headers: { Authorization: `Bearer ${jwt}` } },
  );
  return parseJson(res);
}

export async function requestChainProof(
  jwt: string,
  pandaId: string,
  tradeFactId: string,
): Promise<ChainProofRequestResultApi> {
  const res = await fetch(
    `${apiBase()}/api/panda/${pandaId}/chain-proof/${tradeFactId}/request`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    },
  );
  return parseJson(res);
}

/** MVP journey route helpers — Epic 10 shared route-jump contract. */

export type JourneyStep =
  | "no-vault"
  | "active"
  | "strategy"
  | "training"
  | "proof"
  | "review"
  | "safety";

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function agentWalletSetupPath(pandaId: string, step: JourneyStep = "no-vault"): string {
  return withQuery("/agent-wallet", { panda: pandaId, step });
}

export function strategyPath(pandaId: string): string {
  return `/strategy/${encodeURIComponent(pandaId)}`;
}

export function trainingLedgerPath(pandaId: string): string {
  return `/training-ledger/${encodeURIComponent(pandaId)}`;
}

export function chainProofPath(pandaId: string, tradeFactId?: string): string {
  return withQuery("/chain-proof", { panda: pandaId, fact: tradeFactId });
}

export function reviewPath(pandaId: string, tradeFactId?: string): string {
  return withQuery("/review", { panda: pandaId, fact: tradeFactId });
}

export function safetyPath(pandaId: string): string {
  return `/safety/${encodeURIComponent(pandaId)}`;
}

export const MVP_JOURNEY_ORDER: JourneyStep[] = [
  "no-vault",
  "strategy",
  "training",
  "proof",
  "review",
  "safety",
];

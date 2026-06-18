import type { TrainingLedgerState } from "@/services/training.service";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";
import type { WsConnectionStatus } from "@/types/ws";

const FRESH_TICK_MAX_AGE_SEC = 120;

export interface TrainingPreflightItem {
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

export interface TrainingPreflightInput {
  walletReady: boolean;
  hasStrategy: boolean;
  policyPaused: boolean;
  currentPair: string;
  currentPairAllowed: boolean;
  currentPairSubscribed: boolean;
  wsStatus: WsConnectionStatus;
  lastTickAgeSec: number | null | undefined;
}

export interface LatestDecisionSummary {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "default" | "pass" | "warn" | "danger";
  scoreLabel: string;
  reason: string;
  decisionHash: string | null;
  tradeFactId: string | null;
  proofStatus: string | null;
  reviewStatus: string | null;
  ledgerDelta: string | null;
  canOpenProof: boolean;
  canOpenReview: boolean;
  intent: OrderIntentApi | null;
  tradeFact: TradeFactApi | null;
}

function formatSignedMoney(value: number): string {
  const amount = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "-"}$${amount}`;
}

function formatSignedQuantity(value: number): string {
  const amount = Math.abs(value).toFixed(4);
  return `${value >= 0 ? "+" : "-"}${amount}`;
}

function summarizePositionDelta(
  before: TradeFactApi["ledger_snapshot_before"],
  after: TradeFactApi["ledger_snapshot_after"],
): string | null {
  const beforePositions = before?.positions;
  const afterPositions = after?.positions;
  if (!Array.isArray(beforePositions) || !Array.isArray(afterPositions)) {
    return null;
  }

  const byAsset = new Map<string, { before: number; after: number }>();
  for (const pos of beforePositions) {
    if (!pos?.asset) continue;
    byAsset.set(pos.asset, { before: Number(pos.quantity ?? 0), after: 0 });
  }
  for (const pos of afterPositions) {
    if (!pos?.asset) continue;
    const current = byAsset.get(pos.asset) ?? { before: 0, after: 0 };
    current.after = Number(pos.quantity ?? 0);
    byAsset.set(pos.asset, current);
  }

  const deltas = Array.from(byAsset.entries())
    .map(([asset, values]) => ({
      asset,
      delta: values.after - values.before,
    }))
    .filter((item) => Math.abs(item.delta) > 1e-9);

  if (deltas.length === 0) {
    return null;
  }

  const top = deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return `${top.asset} ${formatSignedQuantity(top.delta)}`;
}

export function buildTrainingPreflightItems({
  walletReady,
  hasStrategy,
  policyPaused,
  currentPair,
  currentPairAllowed,
  currentPairSubscribed,
  wsStatus,
  lastTickAgeSec,
}: TrainingPreflightInput): TrainingPreflightItem[] {
  const hasFreshTick = lastTickAgeSec != null && lastTickAgeSec <= FRESH_TICK_MAX_AGE_SEC;

  return [
    {
      label: "Wallet",
      ok: walletReady,
      detail: walletReady ? "Vault + policy mirror ready" : "Agent Wallet not ready",
      required: true,
    },
    {
      label: "Strategy",
      ok: hasStrategy,
      detail: hasStrategy ? "Active strategy loaded" : "Feed strategy first",
      required: true,
    },
    {
      label: "Pair",
      ok: currentPairAllowed,
      detail: !currentPairAllowed
        ? `${currentPair} is not authorized`
        : `${currentPair} authorized`,
      required: true,
    },
    {
      label: "Policy",
      ok: !policyPaused,
      detail: policyPaused ? "Policy paused" : "Policy active",
      required: true,
    },
    {
      label: "Market WS",
      ok: wsStatus === "open",
      detail:
        wsStatus === "open"
          ? "WebSocket connected"
          : wsStatus === "connecting"
            ? "WebSocket connecting"
            : "No tick channel yet",
      required: false,
    },
    {
      label: "Tick freshness",
      ok: hasFreshTick,
      detail:
        lastTickAgeSec == null
          ? "No tick received yet"
          : hasFreshTick
            ? `Last tick ${lastTickAgeSec}s ago`
            : `Last tick ${lastTickAgeSec}s ago (stale)`,
      required: false,
    },
  ];
}

function buildLedgerDelta(tradeFact: TradeFactApi | null): string | null {
  if (!tradeFact?.ledger_snapshot_before || !tradeFact?.ledger_snapshot_after) {
    return null;
  }

  const before = tradeFact.ledger_snapshot_before;
  const after = tradeFact.ledger_snapshot_after;
  const pieces = [
    before.cash_balance != null && after.cash_balance != null
      ? `Cash ${formatSignedMoney(Number(after.cash_balance) - Number(before.cash_balance))}`
      : null,
    before.equity != null && after.equity != null
      ? `Equity ${formatSignedMoney(Number(after.equity) - Number(before.equity))}`
      : null,
    before.realized_pnl != null && after.realized_pnl != null
      ? `Realized ${formatSignedMoney(Number(after.realized_pnl) - Number(before.realized_pnl))}`
      : null,
    before.unrealized_pnl != null && after.unrealized_pnl != null
      ? `Unrealized ${formatSignedMoney(Number(after.unrealized_pnl) - Number(before.unrealized_pnl))}`
      : null,
    summarizePositionDelta(before, after),
  ].filter((piece): piece is string => Boolean(piece));

  return pieces.length > 0 ? pieces.join(" · ") : null;
}

function statusToneForIntent(intent: OrderIntentApi | null): LatestDecisionSummary["statusTone"] {
  if (!intent) return "default";
  if (intent.status === "EXECUTED") return "pass";
  if (intent.status === "REJECTED") return "danger";
  if (intent.status === "SKIPPED") return "warn";
  return "default";
}

function statusLabelForIntent(intent: OrderIntentApi | null): string {
  if (!intent) return "No decision";
  if (intent.status === "EXECUTED") return "Paper executed";
  if (intent.status === "REJECTED") return "Rejected";
  if (intent.status === "SKIPPED") return "Skipped";
  return "Decided";
}

function scoreLabel(intent: OrderIntentApi | null, tradeFact: TradeFactApi | null): string {
  if (intent?.final_score != null) {
    return intent.final_score.toFixed(2);
  }
  if (tradeFact?.realized_pnl != null) {
    return tradeFact.realized_pnl.toFixed(2);
  }
  return "—";
}

export function summarizeLatestDecision({
  intent,
  tradeFact,
}: {
  intent: OrderIntentApi | null;
  tradeFact: TradeFactApi | null;
  ledger?: TrainingLedgerState | null;
}): LatestDecisionSummary | null {
  if (!intent && !tradeFact) {
    return null;
  }

  const resolvedIntent = intent ?? null;
  const resolvedTradeFact = tradeFact ?? null;
  const title = resolvedIntent
    ? `${resolvedIntent.side} · ${resolvedIntent.pair}`
    : `${resolvedTradeFact?.side ?? "—"} · ${resolvedTradeFact?.pair ?? "—"}`;
  const subtitle = resolvedIntent
    ? `Decision ${resolvedIntent.decision_hash.slice(0, 10)}…`
    : resolvedTradeFact
      ? `Trade Fact ${resolvedTradeFact.id.slice(0, 8)}…`
      : "Latest activity";
  const reason =
    resolvedIntent?.rejection_reason ??
    resolvedIntent?.reason ??
    (resolvedTradeFact?.realized_pnl != null
      ? `Realized PnL ${formatSignedMoney(Number(resolvedTradeFact.realized_pnl))}`
      : "Awaiting trade fact");
  const ledgerDelta = buildLedgerDelta(resolvedTradeFact);

  return {
    title,
    subtitle,
    statusLabel: statusLabelForIntent(resolvedIntent),
    statusTone: statusToneForIntent(resolvedIntent),
    scoreLabel: scoreLabel(resolvedIntent, resolvedTradeFact),
    reason,
    decisionHash: resolvedIntent?.decision_hash ?? null,
    tradeFactId: resolvedTradeFact?.id ?? null,
    proofStatus: resolvedTradeFact?.proof_status ?? null,
    reviewStatus: resolvedTradeFact?.review_status ?? null,
    ledgerDelta,
    canOpenProof: Boolean(resolvedTradeFact),
    canOpenReview: Boolean(resolvedTradeFact),
    intent: resolvedIntent,
    tradeFact: resolvedTradeFact,
  };
}

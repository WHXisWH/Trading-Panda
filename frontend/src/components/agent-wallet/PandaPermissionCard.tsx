"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { safetyPath } from "@/lib/ui/routeJump";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";
import type { PandaSummaryApi } from "@/types/panda";
import { formatPaperUsd } from "@/lib/agentWallet/paperUsd";

interface PandaPermissionCardProps {
  panda: PandaSummaryApi;
  status: AgentWalletStatusApi | null;
  onViewObjects?: () => void;
}

function truncateId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function StatusBadge({
  ready,
  readyLabel,
  missingLabel,
}: {
  ready: boolean;
  readyLabel: string;
  missingLabel: string;
}) {
  return (
    <span
      className={clsx(
        "agent-wallet-badge",
        ready ? "agent-wallet-badge--ready" : "agent-wallet-badge--pending",
      )}
    >
      {ready ? readyLabel : missingLabel}
    </span>
  );
}

export function PandaPermissionCard({ panda, status, onViewObjects }: PandaPermissionCardProps) {
  const vaultReady = Boolean(status?.vault?.sui_object_id);
  const policyReady = Boolean(status?.policy?.sui_object_id);
  const signerReady = Boolean(status?.authorized_agent_configured);
  const trainingBudget = status?.vault?.training_budget;
  const hasObjects = vaultReady || policyReady;

  return (
    <section className="agent-wallet-card space-y-4 p-5 md:p-6">
      <div className="space-y-1.5">
        <p className="product-eyebrow text-[10px]">Panda permission</p>
        <h2 className="font-sans text-lg font-bold tracking-tight text-product-text">
          {panda.name ?? "Your Panda"}
        </h2>
        <p className="text-[12px] leading-relaxed text-product-muted">
          Panda cannot loosen policy alone. Only you can sign collar changes.
        </p>
      </div>

      <dl className="space-y-2 text-[13px]">
        <div className="agent-wallet-status-row">
          <dt className="text-product-muted">NFT identity</dt>
          <dd className="font-mono text-[12px] text-product-text">{truncateId(panda.sui_object_id)}</dd>
        </div>
        <div className="agent-wallet-status-row">
          <dt className="text-product-muted">PandaVault</dt>
          <dd>
            <StatusBadge ready={vaultReady} readyLabel="Active" missingLabel="Missing" />
          </dd>
        </div>
        <div className="agent-wallet-status-row">
          <dt className="text-product-muted">TradingPolicy</dt>
          <dd>
            <StatusBadge
              ready={policyReady}
              readyLabel={`v${status?.policy?.version ?? 1}`}
              missingLabel="Missing"
            />
          </dd>
        </div>
        <div className="agent-wallet-status-row">
          <dt className="text-product-muted">Training budget (USD)</dt>
          <dd className="font-mono text-[12px] text-product-text">
            {trainingBudget != null ? formatPaperUsd(trainingBudget) : "—"}
          </dd>
        </div>
        <div className="agent-wallet-status-row">
          <dt className="text-product-muted">Agent signer</dt>
          <dd>
            <StatusBadge ready={signerReady} readyLabel="Configured" missingLabel="Not set" />
          </dd>
        </div>
      </dl>

      {status?.setup_state === "ready" ? (
        <div className="agent-wallet-divider space-y-2.5 pt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="agent-wallet-btn-secondary w-full"
            disabled={!hasObjects || !onViewObjects}
            onClick={onViewObjects}
          >
            View on-chain objects
          </Button>
          <Link href={safetyPath(panda.id)} className="block">
            <Button type="button" size="sm" variant="ghost" className="agent-wallet-btn-ghost w-full">
              Emergency controls
            </Button>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

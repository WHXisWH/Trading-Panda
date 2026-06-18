"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
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
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        ready
          ? "bg-product-green/10 text-product-green"
          : "bg-product-amber/15 text-product-amber",
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
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-product-muted">
          Panda permission
        </p>
        <h2 className="font-sans text-lg font-bold text-product-text">{panda.name ?? "Your Panda"}</h2>
        <p className="text-[12px] text-product-muted">
          Panda cannot loosen policy alone. Only you can sign collar changes.
        </p>
      </div>

      <dl className="space-y-2 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-product-muted">NFT identity</dt>
          <dd className="font-mono text-[12px] text-product-text">{truncateId(panda.sui_object_id)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-product-muted">PandaVault</dt>
          <dd>
            <StatusBadge ready={vaultReady} readyLabel="Active" missingLabel="Missing" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-product-muted">TradingPolicy</dt>
          <dd>
            <StatusBadge
              ready={policyReady}
              readyLabel={`v${status?.policy?.version ?? 1}`}
              missingLabel="Missing"
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-product-muted">Training budget (USD)</dt>
          <dd className="font-mono text-[12px] text-product-text">
            {trainingBudget != null ? formatPaperUsd(trainingBudget) : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-product-muted">Agent signer</dt>
          <dd>
            <StatusBadge ready={signerReady} readyLabel="Configured" missingLabel="Not set" />
          </dd>
        </div>
      </dl>

      {status?.setup_state === "ready" ? (
        <div className="space-y-2 border-t border-product-line/40 pt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!hasObjects || !onViewObjects}
            onClick={onViewObjects}
          >
            View on-chain objects
          </Button>
          <Link href={safetyPath(panda.id)} className="block">
            <Button type="button" size="sm" variant="ghost" className="w-full">
              Emergency controls
            </Button>
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

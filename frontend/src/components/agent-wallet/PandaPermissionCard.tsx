"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";
import type { PandaSummaryApi } from "@/types/panda";

interface PandaPermissionCardProps {
  panda: PandaSummaryApi;
  status: AgentWalletStatusApi | null;
}

function truncateId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function PandaPermissionCard({ panda, status }: PandaPermissionCardProps) {
  const vaultReady = Boolean(status?.vault?.sui_object_id);
  const policyReady = Boolean(status?.policy?.sui_object_id);
  const signerReady = Boolean(status?.authorized_agent_configured);

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Panda permission
        </p>
        <h2 className="font-sans text-lg font-bold">{panda.name ?? "Your Panda"}</h2>
        <p className="text-[12px] text-neutral-500">
          Panda cannot loosen policy alone. Only you can sign collar changes.
        </p>
      </div>

      <dl className="space-y-2 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">NFT identity</dt>
          <dd className="font-mono text-[12px]">{truncateId(panda.sui_object_id)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">PandaVault</dt>
          <dd>
            <Badge className={vaultReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {vaultReady ? "Active" : "Missing"}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">TradingPolicy</dt>
          <dd>
            <Badge className={policyReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {policyReady ? `v${status?.policy?.version ?? 1}` : "Missing"}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">Agent signer</dt>
          <dd>
            <Badge className={signerReady ? "bg-primary-50 text-primary-600" : "bg-amber-50 text-amber-700"}>
              {signerReady ? "Configured" : "Not set"}
            </Badge>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

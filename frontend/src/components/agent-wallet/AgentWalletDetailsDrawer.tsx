"use client";

import { Drawer } from "@/components/ui/Drawer";
import { TruncatedEvidence } from "@/lib/ui/disclosure";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";

interface AgentWalletDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AgentWalletStatusApi | null;
  txDigest?: string | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-product-muted">
        {label}
      </dt>
      <dd className="break-all font-mono text-[12px] text-product-text">{value}</dd>
    </div>
  );
}

export function AgentWalletDetailsDrawer({
  open,
  onOpenChange,
  status,
  txDigest,
}: AgentWalletDetailsDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Agent Wallet objects"
      description="Chain object ids and mirror state"
    >
      <dl className="space-y-4">
        {status?.vault?.sui_object_id ? (
          <TruncatedEvidence label="PandaVault" value={status.vault.sui_object_id} />
        ) : (
          <DetailRow label="PandaVault" value="—" />
        )}
        {status?.policy?.sui_object_id ? (
          <TruncatedEvidence label="TradingPolicy" value={status.policy.sui_object_id} />
        ) : (
          <DetailRow label="TradingPolicy" value="—" />
        )}
        <DetailRow label="Policy version" value={String(status?.policy?.version ?? "—")} />
        {status?.policy?.authorized_agent || status?.agent_signer_address ? (
          <TruncatedEvidence
            label="Authorized agent"
            value={status?.policy?.authorized_agent ?? status?.agent_signer_address ?? "—"}
          />
        ) : (
          <DetailRow label="Authorized agent" value="—" />
        )}
        <DetailRow label="Mirror sync" value={status?.mirror_sync_status ?? "—"} />
        {txDigest ? <TruncatedEvidence label="Setup tx digest" value={txDigest} /> : null}
      </dl>
    </Drawer>
  );
}

"use client";

import { Drawer } from "@/components/ui/Drawer";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";

interface AgentWalletDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AgentWalletStatusApi | null;
  txDigest?: string | null;
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
      title="Agent Wallet objects"
      description="Chain object ids and mirror state"
    >
      <dl className="space-y-3 text-[13px]">
        <div>
          <dt className="text-neutral-500">PandaVault</dt>
          <dd className="break-all font-mono text-[12px]">
            {status?.vault?.sui_object_id ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">TradingPolicy</dt>
          <dd className="break-all font-mono text-[12px]">
            {status?.policy?.sui_object_id ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Policy version</dt>
          <dd>{status?.policy?.version ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Authorized agent</dt>
          <dd className="break-all font-mono text-[12px]">
            {status?.policy?.authorized_agent ?? status?.agent_signer_address ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Mirror sync</dt>
          <dd>{status?.mirror_sync_status ?? "—"}</dd>
        </div>
        {txDigest ? (
          <div>
            <dt className="text-neutral-500">Setup tx digest</dt>
            <dd className="break-all font-mono text-[12px]">{txDigest}</dd>
          </div>
        ) : null}
      </dl>
    </Drawer>
  );
}

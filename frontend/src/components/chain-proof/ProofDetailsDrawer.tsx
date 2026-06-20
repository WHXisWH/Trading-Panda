"use client";

import { Drawer } from "@/components/ui/Drawer";
import type { ChainProofStatusApi } from "@/types/autonomous-wallet";

interface ProofDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ChainProofStatusApi;
}

export function ProofDetailsDrawer({ open, onOpenChange, status }: ProofDetailsDrawerProps) {
  const { objects, chain_execution: exec, order_intent: intent } = status;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Proof details"
      description="Full object ids, hashes, and PTB path summary."
    >
      <dl className="space-y-3 text-[12px] text-neutral-300">
        <div>
          <dt className="text-neutral-500">Trade Fact id</dt>
          <dd className="break-all font-mono">{status.trade_fact.id}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Decision hash</dt>
          <dd className="break-all font-mono">{exec.decision_hash ?? intent.decision_hash}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Proof key</dt>
          <dd className="break-all font-mono">{exec.proof_key}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Submission mode</dt>
          <dd className={exec.dry_run ? "text-amber-300" : "text-emerald-300"}>
            {exec.dry_run ? "Dry-run only — no on-chain transaction" : "Real testnet transaction"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">PandaVault</dt>
          <dd className="break-all font-mono">{objects.vault_object_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">TradingPolicy</dt>
          <dd className="break-all font-mono">{objects.policy_object_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">PTB path</dt>
          <dd>
            chain_proof_executor::submit_chain_proof → ChainProofRecorded
          </dd>
        </div>
        {exec.event_payload ? (
          <div>
            <dt className="text-neutral-500">Move event payload</dt>
            <dd className="break-all font-mono text-[11px]">
              {JSON.stringify(exec.event_payload, null, 2)}
            </dd>
          </div>
        ) : null}
      </dl>
    </Drawer>
  );
}

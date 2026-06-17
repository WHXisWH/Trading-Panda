"use client";

import { Modal } from "@/components/ui/Modal";
import type { PolicyDraft } from "@/types/agent-wallet";

interface AuthorizedAgentReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentAddress: string | null;
  draft: PolicyDraft;
  onConfirm: () => void;
}

function shortAddr(addr: string | null): string {
  if (!addr) return "Not configured";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function AuthorizedAgentReview({
  open,
  onOpenChange,
  agentAddress,
  draft,
  onConfirm,
}: AuthorizedAgentReviewProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Review Agent Signer"
      description="You authorize a bounded testnet signer — not your full wallet. Policy loosening always requires your signature."
      cancelLabel="Back"
      confirmLabel="Create PandaVault + Policy"
      onConfirm={onConfirm}
    >
      <dl className="space-y-2 rounded-xl border border-product-line bg-white/[0.03] p-4 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-product-muted">Signer address</dt>
          <dd className="font-mono text-[12px] text-product-text">{shortAddr(agentAddress)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-product-muted">Scope</dt>
          <dd className="text-product-text">Policy-bound · this Panda only</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-product-muted">Pairs</dt>
          <dd className="text-product-text">{draft.allowedPairs.join(", ") || "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-product-muted">Max notional</dt>
          <dd className="text-product-text">{draft.maxNotionalPerTrade}</dd>
        </div>
      </dl>
    </Modal>
  );
}

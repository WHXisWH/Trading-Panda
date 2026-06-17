"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="font-sans text-lg font-bold">
            Review Agent Signer
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] text-neutral-600">
            You authorize a bounded testnet signer — not your full wallet. Policy loosening always
            requires your signature.
          </Dialog.Description>

          <dl className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-4 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Signer address</dt>
              <dd className="font-mono text-[12px]">{shortAddr(agentAddress)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Scope</dt>
              <dd>Policy-bound · this Panda only</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Pairs</dt>
              <dd>{draft.allowedPairs.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Max notional</dt>
              <dd>{draft.maxNotionalPerTrade}</dd>
            </div>
          </dl>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button onClick={onConfirm}>Create PandaVault + Policy</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

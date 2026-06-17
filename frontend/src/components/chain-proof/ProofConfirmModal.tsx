"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

interface ProofConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  agentAddress: string | null;
  isSubmitting: boolean;
}

export function ProofConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  agentAddress,
  isSubmitting,
}: ProofConfirmModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--color-border)] bg-neutral-950 p-6 shadow-xl">
          <Dialog.Title className="font-sans text-lg font-bold text-neutral-100">
            Prove on-chain
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] text-neutral-400">
            The environment Agent Signer will submit a testnet PandaCoin demo PTB. This proves the
            Panda can act inside the policy collar — it does not replace paper ledger accounting.
          </Dialog.Description>
          {agentAddress ? (
            <p className="mt-3 font-mono text-[11px] text-neutral-500">
              Authorized agent: {agentAddress.slice(0, 10)}…{agentAddress.slice(-6)}
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-amber-400">Agent Signer is not configured.</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Confirm proof"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

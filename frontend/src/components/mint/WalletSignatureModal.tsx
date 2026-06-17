"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { GasFeeHint } from "@/components/mint/GasFeeHint";

interface WalletSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/** Pre-sign confirmation before Sui wallet popup (page-mint §9). */
export function WalletSignatureModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  title = "Sign mint transaction",
  description = "Your wallet will create a Panda NFT with immutable on-chain personality. No Agent Wallet or trading policy is created in this step.",
  confirmLabel = "Confirm & sign",
}: WalletSignatureModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(400px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg animate-modal-in">
          <Dialog.Title className="font-sans text-lg font-bold text-neutral-900">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            {description}
          </Dialog.Description>
          <div className="mt-4 rounded-lg bg-neutral-50 px-3 py-3">
            <GasFeeHint />
          </div>
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1" disabled={loading}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button className="flex-1" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

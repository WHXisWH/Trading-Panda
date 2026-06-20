"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

interface WhyNotUpdatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export function WhyNotUpdatedModal({
  open,
  onOpenChange,
  message,
}: WhyNotUpdatedModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-product-line bg-[rgba(9,12,9,0.96)] p-6 text-product-text shadow-[var(--shadow-product)]">
          <Dialog.Title className="font-sans text-lg font-black">
            Why not updated?
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-[13px] leading-relaxed text-product-muted">
            {message ??
              "The Panda only updates Skill Memory when a closed trade review finds supported or verified evidence. Profit alone, weak signals, or missing decision facts do not create a durable lesson."}
          </Dialog.Description>
          <div className="mt-6 flex justify-end">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

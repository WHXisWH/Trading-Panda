"use client";

import { Modal } from "@/components/ui/Modal";
import { GasFeeHint, type GasFeeHintVariant } from "@/components/mint/GasFeeHint";

interface WalletSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  gasVariant?: GasFeeHintVariant;
}

/** Pre-sign confirmation before Sui wallet popup (page-mint §9). */
export function WalletSignatureModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  title = "Sign mint transaction",
  description = "Your wallet will create a Panda NFT with immutable on-chain personality.",
  confirmLabel = "Confirm & sign",
  gasVariant = "mint",
}: WalletSignatureModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      size="lg"
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      loading={loading}
      onConfirm={onConfirm}
    >
      <GasFeeHint muted variant={gasVariant} />
    </Modal>
  );
}

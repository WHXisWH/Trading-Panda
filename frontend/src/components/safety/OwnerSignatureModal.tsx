"use client";

import { Modal } from "@/components/ui/Modal";
import type { SafetyActionKind } from "@/hooks/useSafetyControls";

const copy: Record<
  Exclude<SafetyActionKind, "tighten">,
  { title: string; description: string; confirm: string }
> = {
  pause: {
    title: "Pause Panda execution",
    description:
      "Training Ledger paper execution and new Chain Proof submissions stop immediately after your signature.",
    confirm: "Sign pause",
  },
  unpause: {
    title: "Resume Panda execution",
    description:
      "Paper execution may resume when strategy, vault, and market data are healthy.",
    confirm: "Sign resume",
  },
  revoke: {
    title: "Revoke authorized agent",
    description:
      "The testnet Agent Signer can no longer submit PandaCoin proof PTBs for this Panda. Policy is also paused.",
    confirm: "Sign revoke",
  },
};

export function OwnerSignatureModal({
  open,
  onOpenChange,
  action,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Exclude<SafetyActionKind, "tighten"> | null;
  loading?: boolean;
  onConfirm: () => void;
}) {
  if (!action) return null;
  const c = copy[action];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      danger={action !== "unpause"}
      title={c.title}
      description={c.description}
      confirmLabel={c.confirm}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

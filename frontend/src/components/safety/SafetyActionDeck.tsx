"use client";

import { clsx } from "clsx";
import type { SafetyActionKind } from "@/hooks/useSafetyControls";

interface Props {
  isPaused: boolean;
  highlightedAction: SafetyActionKind | null;
  canPause: boolean;
  canUnpause: boolean;
  canRevoke: boolean;
  canTighten: boolean;
  disabled?: boolean;
  onSelect: (action: SafetyActionKind) => void;
}

export function SafetyActionDeck({
  isPaused,
  highlightedAction,
  canPause,
  canUnpause,
  canRevoke,
  canTighten,
  disabled,
  onSelect,
}: Props) {
  const primaryAction: SafetyActionKind = isPaused ? "unpause" : "pause";

  return (
    <div className="space-y-3">
      <ActionTile
        label={isPaused ? "Resume execution" : "Pause now"}
        hint={
          isPaused
            ? "Resume Training Ledger when healthy"
            : "Immediate stop — paper trades and new proofs"
        }
        tone={isPaused ? "primary" : "danger"}
        selected={highlightedAction === primaryAction}
        disabled={disabled || (isPaused ? !canUnpause : !canPause)}
        large
        onClick={() => onSelect(primaryAction)}
      />

      <div className="grid grid-cols-2 gap-3">
        <ActionTile
          label="Revoke agent"
          hint="Remove testnet signer"
          tone="danger"
          selected={highlightedAction === "revoke"}
          disabled={disabled || !canRevoke}
          onClick={() => onSelect("revoke")}
        />
        <ActionTile
          label="Tighten limits"
          hint="Lower caps only"
          tone="gold"
          selected={highlightedAction === "tighten"}
          disabled={disabled || !canTighten}
          onClick={() => onSelect("tighten")}
        />
      </div>
    </div>
  );
}

function ActionTile({
  label,
  hint,
  tone,
  selected,
  disabled,
  large,
  onClick,
}: {
  label: string;
  hint: string;
  tone: "danger" | "primary" | "gold";
  selected?: boolean;
  disabled?: boolean;
  large?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex w-full flex-col items-start rounded-[22px] px-4 py-4 text-left transition-all ring-1 ring-inset",
        large && "py-5",
        selected && tone === "danger" && "ring-product-red/45 bg-[radial-gradient(circle_at_100%_0%,rgba(255,95,86,0.18),transparent_42%)] bg-product-red/10 shadow-[0_0_34px_rgba(255,95,86,0.14)]",
        selected && tone === "gold" && "ring-product-gold/35 bg-product-gold/10 shadow-[var(--glow-gold)]",
        selected && tone === "primary" && "ring-product-green/40 bg-product-green/10 shadow-[var(--glow-green)]",
        !selected && "bg-black/25 ring-[rgba(225,186,92,0.1)] hover:ring-[rgba(225,186,92,0.22)]",
        !selected && tone === "danger" && "hover:ring-product-red/25",
        !selected && tone === "gold" && "hover:ring-product-gold/25",
        !selected && tone === "primary" && "hover:ring-product-green/25",
        disabled && "opacity-50",
      )}
    >
      <span
        className={clsx(
          "font-sans font-bold",
          large ? "text-lg" : "text-base",
          tone === "danger" && "text-product-red",
          tone === "gold" && "text-product-gold",
          tone === "primary" && "text-product-green",
        )}
      >
        {label}
      </span>
      <span className="mt-1.5 text-[12px] leading-snug text-product-muted">{hint}</span>
    </button>
  );
}

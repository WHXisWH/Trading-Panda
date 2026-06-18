"use client";

import { clsx } from "clsx";
import { ChevronRight, Pause, ShieldOff, SlidersHorizontal } from "lucide-react";
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

type ActionTone = "danger" | "primary" | "gold";

interface ActionSpec {
  id: SafetyActionKind;
  label: string;
  hint: string;
  tone: ActionTone;
  disabled: boolean;
  icon: typeof Pause;
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

  const actions: ActionSpec[] = [
    {
      id: primaryAction,
      label: isPaused ? "Resume execution" : "Pause now",
      hint: isPaused
        ? "Resume Training Ledger when healthy"
        : "Immediate stop — paper trades and new proofs",
      tone: isPaused ? "primary" : "danger",
      disabled: Boolean(disabled || (isPaused ? !canUnpause : !canPause)),
      icon: Pause,
    },
    {
      id: "revoke",
      label: "Revoke agent",
      hint: "Remove testnet signer — cannot undo without new setup",
      tone: "danger",
      disabled: Boolean(disabled || !canRevoke),
      icon: ShieldOff,
    },
    {
      id: "tighten",
      label: "Tighten limits",
      hint: "Lower caps only — policy version increments",
      tone: "gold",
      disabled: Boolean(disabled || !canTighten),
      icon: SlidersHorizontal,
    },
  ];

  return (
    <section className="space-y-3" aria-label="Emergency actions">
      <div>
        <p className="safety-step-label">Step 1</p>
        <h2 className="mt-1.5 font-sans text-base font-bold text-product-text">
          Choose an action
        </h2>
        <p className="mt-1 text-[12px] text-product-muted">
          Pick what you need — review the impact below before signing.
        </p>
      </div>

      <div className="safety-action-group" role="listbox" aria-label="Safety actions">
        {actions.map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            selected={highlightedAction === action.id}
            onSelect={() => onSelect(action.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ActionRow({
  action,
  selected,
  onSelect,
}: {
  action: ActionSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={action.disabled}
      onClick={onSelect}
      className={clsx(
        "safety-action-row",
        selected && "safety-action-row--selected",
        selected && action.tone === "gold" && "safety-action-row--gold",
        selected && action.tone === "primary" && "safety-action-row--primary",
      )}
    >
      <span
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          action.tone === "danger" && "bg-product-red/12 text-product-red",
          action.tone === "gold" && "bg-product-gold/12 text-product-gold",
          action.tone === "primary" && "bg-product-green/12 text-product-green",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            "block font-sans text-[15px] font-bold leading-tight",
            action.tone === "danger" && "text-product-red",
            action.tone === "gold" && "text-product-gold",
            action.tone === "primary" && "text-product-green",
          )}
        >
          {action.label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-product-muted">
          {action.hint}
        </span>
      </span>

      <ChevronRight
        className={clsx(
          "h-4 w-4 shrink-0 transition-transform",
          selected ? "translate-x-0.5 text-product-text" : "text-product-muted/60",
        )}
        aria-hidden
      />
    </button>
  );
}

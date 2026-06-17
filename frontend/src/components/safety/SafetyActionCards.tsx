"use client";

import { Button } from "@/components/ui/Button";

interface SafetyCardProps {
  title: string;
  consequence: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export function PausePolicyCard(props: SafetyCardProps) {
  return <SafetyActionCard {...props} danger={props.danger} />;
}

export function RevokeAgentCard(props: SafetyCardProps) {
  return <SafetyActionCard {...props} danger />;
}

export function TightenLimitsCard({
  onAction,
  disabled,
}: {
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <SafetyActionCard
      title="Tighten limits"
      consequence="Lower caps or pairs — policy version increments."
      detail="Loosening is never available here. Use Agent Wallet setup for new permissions."
      actionLabel="Edit tighter limits"
      onAction={onAction}
      disabled={disabled}
    />
  );
}

function SafetyActionCard({
  title,
  consequence,
  detail,
  actionLabel,
  onAction,
  disabled,
  danger,
}: SafetyCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-product-line bg-product-panel p-4">
      <h3 className={`text-base font-bold ${danger ? "text-product-red" : "text-product-gold"}`}>
        {title}
      </h3>
      <p className="mt-2 text-[13px] font-medium text-product-text">{consequence}</p>
      <p className="mt-2 flex-1 text-[12px] text-product-muted">{detail}</p>
      <Button
        className="mt-4 w-full"
        variant={danger ? "danger" : "primary"}
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </article>
  );
}

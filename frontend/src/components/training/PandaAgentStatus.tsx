"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  emotion: string | null;
  lastIntent?: OrderIntentApi | null;
  skillVersion?: number;
}

const EMOTION_LABELS: Record<string, string> = {
  focused: "Focused",
  excited: "Excited",
  greedy: "Greedy",
  cautious: "Cautious",
  panicking: "Panicking",
  numb: "Numb",
};

export function PandaAgentStatus({ emotion, lastIntent, skillVersion = 0 }: Props) {
  const mood = emotion ? EMOTION_LABELS[emotion] ?? emotion : "—";
  const intentSide = lastIntent?.side ?? "—";
  const intentStatus = lastIntent?.status ?? "—";

  return (
    <div className="product-panel p-4">
      <p className="product-eyebrow">Panda Agent</p>
      <dl className="mt-4 space-y-0">
        <MetricRow label="Mood" value={mood} />
        <MetricRow label="Skill version" value={String(skillVersion)} />
        <MetricRow
          label="Latest intent"
          value={intentSide}
          valueClass={intentSide === "HOLD" ? "text-product-muted" : "text-product-gold"}
        />
        <MetricRow
          label="Intent status"
          value={intentStatus}
          valueClass={clsx(
            intentStatus === "EXECUTED" && "text-product-green",
            intentStatus === "REJECTED" && "text-product-red",
          )}
        />
      </dl>
    </div>
  );
}

function MetricRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="product-metric-row">
      <span>{label}</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  );
}

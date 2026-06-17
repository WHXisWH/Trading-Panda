"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  emotion: string | null;
  lastIntent?: OrderIntentApi | null;
  skillVersion?: number;
}

const EMOTION_LABELS: Record<string, string> = {
  focused: "专注",
  excited: "兴奋",
  greedy: "贪婪",
  cautious: "谨慎",
  panicking: "恐慌",
  numb: "麻木",
};

export function PandaAgentStatus({ emotion, lastIntent, skillVersion = 0 }: Props) {
  const mood = emotion ? EMOTION_LABELS[emotion] ?? emotion : "—";
  const intentSide = lastIntent?.side ?? "—";
  const intentStatus = lastIntent?.status ?? "—";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h3 className="text-sm font-bold text-neutral-900">Panda Agent</h3>
      <dl className="mt-3 space-y-2 text-[12px]">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Mood</dt>
          <dd className="font-medium">{mood}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Skill version</dt>
          <dd>{skillVersion}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Latest intent</dt>
          <dd className={clsx(intentSide === "HOLD" && "text-neutral-600")}>{intentSide}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Intent status</dt>
          <dd
            className={clsx(
              intentStatus === "EXECUTED" && "text-emerald-600",
              intentStatus === "REJECTED" && "text-red-600",
            )}
          >
            {intentStatus}
          </dd>
        </div>
      </dl>
    </div>
  );
}

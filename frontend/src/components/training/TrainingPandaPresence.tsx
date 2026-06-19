"use client";

import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { ProfilePandaPortrait } from "@/components/profile/ProfilePandaPortrait";
import type { SessionPhase } from "@/hooks/useSimulationSession";
import {
  resolveTrainingPortraitOnline,
  resolveTrainingPresenceLabel,
} from "@/lib/training/trainingPresence";
import type { PandaDetailApi } from "@/types/panda";

const SPEEDS = ["1×", "10×", "100×", "跳到结果"] as const;

interface Props {
  panda: PandaDetailApi;
  phase: SessionPhase;
  actorActive: boolean;
  speed: string;
  tradeCount: number;
  onSpeedChange: (speed: string) => void;
  onToggleTraining: () => void;
  onFeedStrategy: () => void;
  embedded?: boolean;
}

function formatGrowthStage(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, " ");
}

export function TrainingPandaPresence({
  panda,
  phase,
  actorActive,
  speed,
  tradeCount,
  onSpeedChange,
  onToggleTraining,
  onFeedStrategy,
  embedded = false,
}: Props) {
  const isRunning = phase === "running";
  const isBusy = phase === "starting" || phase === "stopping";
  const presenceLabel = resolveTrainingPresenceLabel(actorActive, phase);
  const portraitOnline = resolveTrainingPortraitOnline(actorActive);
  const isOnline = presenceLabel === "Online";
  const pandaName = panda.name || `Panda ${panda.id.slice(0, 6)}`;

  return (
    <div
      className={clsx(
        "flex flex-col items-center text-center",
        !embedded && "ledger-panda-presence ledger-surface p-4 lg:sticky lg:top-4 lg:self-start",
      )}
    >
      <div
        className={clsx(
          "flex w-full flex-col items-center rounded-2xl px-3 py-5",
          portraitOnline
            ? "bg-[radial-gradient(circle_at_50%_18%,rgba(109,255,144,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]"
            : "bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.04),transparent_40%)]",
        )}
      >
        <ProfilePandaPortrait
          panda={panda}
          size="training"
          isOnline={portraitOnline}
          showStatusDot={false}
        />

        <p className="mt-4 max-w-full truncate text-sm font-bold text-product-text">{pandaName}</p>
        <p className="mt-0.5 text-[11px] text-product-muted">
          Lv.{panda.experience_level} · {formatGrowthStage(panda.growth_stage)}
        </p>

        <div
          className="mt-4 inline-flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-label={`Panda actor ${presenceLabel}`}
        >
          <span
            className={clsx(
              "inline-block h-2.5 w-2.5 rounded-full",
              isOnline && "animate-pulse bg-product-green shadow-[0_0_10px_rgba(109,255,144,0.75)]",
              !isOnline &&
                (phase === "starting" || phase === "stopping") &&
                "animate-pulse bg-product-amber",
              !isOnline && phase !== "starting" && phase !== "stopping" && "bg-product-muted/70",
            )}
          />
          <span
            className={clsx(
              "text-sm font-bold uppercase tracking-wide",
              isOnline && "text-product-green",
              !isOnline &&
                (phase === "starting" || phase === "stopping") &&
                "text-product-amber",
              !isOnline && phase !== "starting" && phase !== "stopping" && "text-product-muted",
            )}
          >
            {presenceLabel}
          </span>
        </div>

        {isOnline ? (
          <p className="mt-2 font-mono text-[10px] text-product-muted">{tradeCount} trades</p>
        ) : null}
      </div>

      <div className="mt-4 w-full space-y-3">
        <div>
          <p className="ledger-step-label mb-2 text-left">Speed</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={isBusy}
                onClick={() => onSpeedChange(s)}
                className={clsx(
                  "product-toggle-chip text-[11px]",
                  speed === s && "product-toggle-chip-active",
                  isBusy && "opacity-50",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={onFeedStrategy}
          disabled={isBusy}
        >
          Feed strategy
        </Button>

        {isRunning ? (
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={onToggleTraining}
            disabled={isBusy}
          >
            {isBusy ? "Stopping…" : "Stop training"}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={onToggleTraining} disabled={isBusy}>
            {isBusy ? "Starting…" : "Start training"}
          </Button>
        )}
      </div>
    </div>
  );
}

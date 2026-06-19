"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LastActionRow } from "@/components/training/LastActionRow";
import { LedgerQuickLinks } from "@/components/training/LedgerQuickLinks";
import { TrainingPandaPresence } from "@/components/training/TrainingPandaPresence";
import type { SessionPhase } from "@/hooks/useSimulationSession";
import type { PandaDetailApi } from "@/types/panda";
import type { LatestDecisionSummary } from "./trainingLedgerView";

interface Props {
  panda: PandaDetailApi;
  phase: SessionPhase;
  actorActive: boolean;
  speed: string;
  tradeCount: number;
  latestSummary: LatestDecisionSummary | null;
  onSpeedChange: (speed: string) => void;
  onToggleTraining: () => void;
  onFeedStrategy: () => void;
  onInspectAction: (summary: LatestDecisionSummary) => void;
  pandaId: string;
}

function useMinWidthLg(): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return matches;
}

function RailSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const isWide = useMinWidthLg();

  if (isWide) {
    return (
      <section className="ledger-rail-section ledger-surface">
        <p className="ledger-rail-section-summary ledger-step-label">{title}</p>
        <div className="ledger-rail-section-body">{children}</div>
      </section>
    );
  }

  return (
    <details className="ledger-rail-section ledger-surface group" open={defaultOpen}>
      <summary className="ledger-rail-section-summary">
        <span className="ledger-step-label">{title}</span>
        <span className="ledger-rail-chevron text-product-muted" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="ledger-rail-section-body">{children}</div>
    </details>
  );
}

export function TrainingLedgerRail({
  panda,
  pandaId,
  phase,
  actorActive,
  speed,
  tradeCount,
  latestSummary,
  onSpeedChange,
  onToggleTraining,
  onFeedStrategy,
  onInspectAction,
}: Props) {
  return (
    <aside className="ledger-rail flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-w-[320px] lg:self-start">
      <RailSection title="Panda & training" defaultOpen>
        <TrainingPandaPresence
          panda={panda}
          phase={phase}
          actorActive={actorActive}
          speed={speed}
          tradeCount={tradeCount}
          onSpeedChange={onSpeedChange}
          onToggleTraining={onToggleTraining}
          onFeedStrategy={onFeedStrategy}
          embedded
        />
      </RailSection>

      <RailSection title="Last action">
        <LastActionRow summary={latestSummary} onInspect={onInspectAction} />
      </RailSection>

      <div className="ledger-surface px-3 py-3">
        <LedgerQuickLinks pandaId={pandaId} />
      </div>
    </aside>
  );
}

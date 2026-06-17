"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { trainingLedgerPath } from "@/lib/ui/routeJump";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EvidenceCourtroom } from "@/components/review/EvidenceCourtroom";
import { SkillMemoryVersionCard } from "@/components/review/SkillMemoryVersionCard";
import {
  TradeOutcomeHeader,
  TradeOutcomeStory,
} from "@/components/review/TradeOutcomeStory";
import { WhyNotUpdatedModal } from "@/components/review/WhyNotUpdatedModal";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLatestSkillVersion,
  fetchPandaReviews,
  fetchSkillMemories,
  fetchTradeFactReview,
} from "@/services/review.service";

export default function ReviewJournalPageClient() {
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda") ?? "";
  const tradeFactId = searchParams.get("fact") ?? "";
  const { jwt } = useAuth();

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [skillDiffOpen, setSkillDiffOpen] = useState(false);
  const [whyNotOpen, setWhyNotOpen] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", pandaId, jwt],
    queryFn: () => fetchPandaReviews(jwt!, pandaId),
    enabled: !!jwt && !!pandaId,
  });

  const selectedReviewQuery = useQuery({
    queryKey: ["review", pandaId, tradeFactId, jwt],
    queryFn: () => fetchTradeFactReview(jwt!, pandaId, tradeFactId),
    enabled: !!jwt && !!pandaId && !!tradeFactId,
  });

  const review = useMemo(() => {
    if (selectedReviewQuery.data) return selectedReviewQuery.data;
    return reviews[0] ?? null;
  }, [reviews, selectedReviewQuery.data]);

  const { data: skillMemories = [] } = useQuery({
    queryKey: ["skill-memories", pandaId, jwt],
    queryFn: () => fetchSkillMemories(jwt!, pandaId),
    enabled: !!jwt && !!pandaId,
  });

  const { data: latestSkill } = useQuery({
    queryKey: ["skill-version", pandaId, jwt],
    queryFn: () => fetchLatestSkillVersion(jwt!, pandaId),
    enabled: !!jwt && !!pandaId,
  });

  const hypothesis = review?.hypotheses?.[0];
  const activeMemory =
    review?.skill_update?.memory ??
    skillMemories.find((m) => m.status === "verified" || m.status === "supported") ??
    null;
  const skillUpdated = Boolean(review?.skill_update?.updated);

  if (!pandaId) {
    return (
      <ProductPageShell className="py-12">
        <p className="text-center text-[13px] text-product-muted">
          Open a review from Training Ledger with ?panda=…&amp;fact=…
        </p>
      </ProductPageShell>
    );
  }

  return (
    <ProductPageShell density="medium" className="space-y-6">
      <DisclosureL0
        eyebrow="Review Journal"
        title="Turn closed trades into learning"
        description="Outcome story and realized PnL first. Evidence refs and skill diff stay in drawers."
      />
      {isLoading || !review || !hypothesis ? (
        <div className="rounded-2xl border border-[var(--color-border)] p-8 text-center text-[13px] text-neutral-500">
          {isLoading ? "Loading review…" : "No closed trade review available yet."}
        </div>
      ) : (
        <>
          <TradeOutcomeHeader
            pair={(review.evidence.market_snapshot as { pair?: string })?.pair}
            verdict={review.verdict}
            realizedPnl={hypothesis.realized_pnl}
            hypothesis={hypothesis}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <TradeOutcomeStory hypothesis={hypothesis} reasonSummary={review.reason_summary} />
            <EvidenceCourtroom hypothesis={hypothesis} />
          </div>

          <SkillMemoryVersionCard
            memory={activeMemory}
            skillVersion={latestSkill ?? null}
            onViewDiff={() => setSkillDiffOpen(true)}
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => setEvidenceOpen(true)}>
              View evidence
            </Button>
            {!skillUpdated ? (
              <Button variant="ghost" size="sm" onClick={() => setWhyNotOpen(true)}>
                Why not updated?
              </Button>
            ) : null}
            <Link href={trainingLedgerPath(pandaId)}>
              <Button size="sm">Continue training</Button>
            </Link>
          </div>
        </>
      )}

      <Drawer
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        variant="product"
        title="Review evidence"
        description="Decision hash, trade fact refs, and snapshots."
      >
        <pre className="overflow-x-auto rounded-lg bg-neutral-50 p-3 text-[11px] text-neutral-700">
          {JSON.stringify(review?.evidence ?? {}, null, 2)}
        </pre>
      </Drawer>

      <Drawer
        open={skillDiffOpen}
        onOpenChange={setSkillDiffOpen}
        variant="product"
        title="Skill diff"
        description="Latest verified or supported memory entries."
      >
        <ul className="space-y-3 text-[12px] text-neutral-700">
          {skillMemories.slice(0, 5).map((m) => (
            <li key={m.id} className="rounded-lg border border-[var(--color-border)] p-3">
              <p className="font-medium">v{m.version} · {m.status}</p>
              <p className="mt-1">{m.rule_text}</p>
            </li>
          ))}
        </ul>
      </Drawer>

      <WhyNotUpdatedModal
        open={whyNotOpen}
        onOpenChange={setWhyNotOpen}
        message={review?.skill_update?.message}
      />
    </ProductPageShell>
  );
}

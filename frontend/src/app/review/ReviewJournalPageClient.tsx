"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  requestTradeReview,
} from "@/services/review.service";

export default function ReviewJournalPageClient() {
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda") ?? "";
  const tradeFactId = searchParams.get("fact") ?? "";
  const { jwt } = useAuth();
  const queryClient = useQueryClient();

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

  const requestReviewMutation = useMutation({
    mutationFn: () => requestTradeReview(jwt!, pandaId, tradeFactId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["review", pandaId, tradeFactId, jwt] }),
        queryClient.invalidateQueries({ queryKey: ["reviews", pandaId, jwt] }),
        queryClient.invalidateQueries({ queryKey: ["skill-memories", pandaId, jwt] }),
        queryClient.invalidateQueries({ queryKey: ["skill-version", pandaId, jwt] }),
      ]);
    },
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
  const skillUpdated = Boolean(review?.skill_update?.updated || activeMemory);

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
        <div className="ledger-surface p-8 text-center text-[13px] text-product-muted">
          <p>
            {isLoading
              ? "Loading review…"
              : tradeFactId
                ? "No review has been created for this closed trade yet."
                : "No closed trade review available yet."}
          </p>
          {tradeFactId && !review ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              <Button
                size="sm"
                onClick={() => requestReviewMutation.mutate()}
                disabled={!jwt || requestReviewMutation.isPending}
              >
                {requestReviewMutation.isPending ? "Reviewing…" : "Request review"}
              </Button>
              {requestReviewMutation.error ? (
                <p className="max-w-md text-[12px] text-product-red">
                  {(requestReviewMutation.error as Error).message}
                </p>
              ) : null}
              {selectedReviewQuery.error && !requestReviewMutation.error ? (
                <p className="max-w-md text-[12px] text-product-muted">
                  Review is not available yet. Request it once the position is closed.
                </p>
              ) : null}
            </div>
          ) : null}
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

          {activeMemory ? (
            <div className="rounded-2xl border border-product-green/25 bg-gradient-to-r from-product-green/[0.12] via-product-green/[0.04] to-transparent px-4 py-3 text-[13px] text-product-green shadow-[inset_0_1px_0_rgba(109,255,144,0.1)]">
              <span className="font-semibold">Panda learned</span> this trade as skill
              memory v{activeMemory.version}.
            </div>
          ) : null}

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
        <pre className="overflow-x-auto rounded-xl border border-product-line bg-black/30 p-3 text-[11px] leading-relaxed text-product-muted">
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
        <ul className="space-y-3 text-[12px] text-product-text">
          {skillMemories.slice(0, 5).map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-product-line bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <p className="font-mono text-[11px] font-bold text-product-green">
                v{m.version} · {m.status}
              </p>
              <p className="mt-2 leading-relaxed text-product-text">{m.rule_text}</p>
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

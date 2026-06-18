"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { StrategyBuilder } from "@/components/trading/StrategyBuilder";
import { GhostInfluenceHint } from "@/components/strategy/GhostInfluenceHint";
import { PolicyCompatibilityPreview } from "@/components/strategy/PolicyCompatibilityPreview";
import { StrategyVersionBar } from "@/components/strategy/StrategyVersionBar";
import { resolveSubscribedPools } from "@/lib/constants/deepbookPools";
import {
  feedStrategy,
  getStrategy,
  strategyErrorMessage,
  validateStrategy,
} from "@/services/strategy.service";
import type { PandaDetailApi } from "@/types/panda";
import type { ParsedStrategyLayers, StrategyValidateData } from "@/types/strategy";
import { toastFailedSafely, toastSuccess } from "@/lib/ui/productToast";

interface FeedStrategyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jwt: string | null;
  pandaId: string;
  panda?: PandaDetailApi | null;
  onSaved?: () => void;
}

function FeedSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="strategy-feed-section space-y-3">
      <div>
        <p className="ledger-step-label">{step}</p>
        <h2 className="mt-1 text-[13px] font-semibold tracking-[-0.02em] text-product-text">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function FeedStrategyDrawer({
  open,
  onOpenChange,
  jwt,
  pandaId,
  panda,
  onSaved,
}: FeedStrategyDrawerProps) {
  const qc = useQueryClient();
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [validateData, setValidateData] = useState<StrategyValidateData | null>(null);
  const [pandaReaction, setPandaReaction] = useState<string | null>(null);

  const { data: strategy } = useQuery({
    queryKey: ["strategy", pandaId, jwt],
    enabled: Boolean(jwt && open),
    queryFn: () => getStrategy(jwt!, pandaId),
  });

  const targetPairs = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools).slice(0, 2),
    [panda?.subscribed_pools],
  );

  const validateMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      validateStrategy(jwt!, pandaId, {
        parsed: {
          ...parsed,
          target_pairs: parsed.target_pairs?.length ? parsed.target_pairs : targetPairs,
        },
      }),
    onSuccess: (data) => {
      setValidateData(data);
      setWarnings(data.warnings);
      setInvalidRuleIndexes(data.invalid_rules.map((r) => r.index));
      if (data.valid) {
        toastSuccess("Strategy validated against policy");
      } else {
        toastFailedSafely("Validation failed", "Check compatibility summary.");
      }
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const feedMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      feedStrategy(jwt!, pandaId, {
        parsed: {
          ...parsed,
          target_pairs: parsed.target_pairs?.length ? parsed.target_pairs : targetPairs,
        },
      }),
    onSuccess: (data) => {
      toast.success(`Strategy v${data.version} saved`);
      setMatchScore(data.personality_match);
      setPandaReaction(data.panda_reaction);
      setValidateData(null);
      void qc.invalidateQueries({ queryKey: ["strategy", pandaId] });
      void qc.invalidateQueries({ queryKey: ["panda-detail", pandaId] });
      void qc.invalidateQueries({ queryKey: ["panda", pandaId] });
      onSaved?.();
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const canSave = Boolean(validateData?.valid && validateData.policy_compatible !== false);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      className="md:w-[min(820px,96vw)]"
      eyebrow="Training cockpit"
      title="Feed strategy"
      description="Teach the Panda what to practice inside the active TradingPolicy. Strategy guides intent — it cannot override risk gates."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-product-muted">
            {canSave
              ? "Policy check passed — save to activate on the ledger."
              : "Run 试编译 after editing rules to unlock Build Strategy."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="agent-wallet-btn-ghost"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {strategy?.is_active ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                Return to cockpit
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <StrategyVersionBar
          theme="product"
          version={strategy?.version}
          isActive={Boolean(strategy?.is_active)}
          isDraft={!strategy}
          matchScore={strategy?.personality_match ?? matchScore}
        />

        <FeedSection step="01 · Policy gate" title="Compatibility with TradingPolicy">
          <PolicyCompatibilityPreview
            theme="product"
            validating={validateMutation.isPending}
            policyVersion={validateData?.policy_version ?? strategy?.policy_version}
            policySummary={validateData?.policy_summary ?? strategy?.policy_summary}
            policyCompatible={validateData?.policy_compatible ?? strategy?.policy_compatible}
            allowedPairs={validateData?.allowed_pairs ?? strategy?.allowed_pairs}
            blockedPairs={validateData?.blocked_pairs ?? strategy?.blocked_pairs}
            targetPairs={validateData?.target_pairs ?? strategy?.target_pairs ?? targetPairs}
            conflicts={validateData?.policy_conflicts ?? strategy?.policy_conflicts}
          />
        </FeedSection>

        <FeedSection step="02 · Strategy builder" title="Rules, sizing, and risk envelope">
          <StrategyBuilder
            theme="product"
            compact
            initialParsed={strategy?.parsed ?? null}
            matchScore={matchScore ?? strategy?.personality_match ?? null}
            warnings={warnings}
            invalidRuleIndexes={invalidRuleIndexes}
            loading={feedMutation.isPending}
            onValidate={(parsed) => validateMutation.mutate(parsed)}
            onSubmit={(parsed) => {
              if (!canSave) {
                toast.error("Validate strategy and resolve policy conflicts first");
                return;
              }
              feedMutation.mutate(parsed);
            }}
            onParseText={() => {
              toast.message("Natural language parsing stays manual for this MVP build");
            }}
          />
        </FeedSection>

        {pandaReaction ? (
          <div className="strategy-feed-reaction">
            <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-product-green/85">
              Panda reaction
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-product-text">{pandaReaction}</p>
          </div>
        ) : null}

        <FeedSection step="03 · Residual memory" title="Ghost influence from prior strategies">
          <GhostInfluenceHint theme="product" ghost={strategy?.ghost_influence} />
          {!strategy?.ghost_influence ? (
            <p className="strategy-feed-ghost rounded-[18px] px-4 py-3 text-[12px] text-product-muted">
              No ghost residue yet — first strategy feed starts with a clean slate.
            </p>
          ) : null}
        </FeedSection>
      </div>
    </Drawer>
  );
}

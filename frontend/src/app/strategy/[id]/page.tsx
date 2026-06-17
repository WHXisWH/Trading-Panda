"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { agentWalletSetupPath, trainingLedgerPath } from "@/lib/ui/routeJump";
import { toastFailedSafely, toastSuccess } from "@/lib/ui/productToast";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StrategyBuilder } from "@/components/trading/StrategyBuilder";
import { GhostInfluenceHint } from "@/components/strategy/GhostInfluenceHint";
import { PolicyCompatibilityPreview } from "@/components/strategy/PolicyCompatibilityPreview";
import { StrategyTemplateRack } from "@/components/strategy/StrategyTemplateRack";
import { StrategyVersionBar } from "@/components/strategy/StrategyVersionBar";
import { useAuth } from "@/hooks/useAuth";
import { resolveSubscribedPools } from "@/lib/constants/deepbookPools";
import { fetchPandaDetail } from "@/services/panda.service";
import {
  feedStrategy,
  getStrategy,
  strategyErrorMessage,
  validateStrategy,
} from "@/services/strategy.service";
import type { ParsedStrategyLayers, StrategyValidateData } from "@/types/strategy";

export default function StrategyPage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const qc = useQueryClient();
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [builderSeed, setBuilderSeed] = useState<ParsedStrategyLayers | null>(null);
  const [builderKey, setBuilderKey] = useState("initial");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [validateData, setValidateData] = useState<StrategyValidateData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pandaReaction, setPandaReaction] = useState<string | null>(null);

  const { data: panda } = useQuery({
    queryKey: ["panda", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, params.id),
  });

  const { data: strategy } = useQuery({
    queryKey: ["strategy", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => getStrategy(jwt!, params.id),
  });

  const targetPairs = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools).slice(0, 2),
    [panda?.subscribed_pools],
  );

  const validateMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      validateStrategy(jwt!, params.id, {
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
      feedStrategy(jwt!, params.id, {
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
      qc.invalidateQueries({ queryKey: ["strategy", params.id] });
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const canSave = Boolean(validateData?.valid && validateData.policy_compatible !== false);

  return (
    <ProductPageShell density="medium" className="space-y-6">
      <DisclosureL0
        eyebrow="Feed Strategy"
        title="Teach your Panda how to practice"
        description="Strategy guides decisions inside the active TradingPolicy. It cannot grant more risk or permission."
      />

      <StrategyVersionBar
        version={strategy?.version}
        isActive={Boolean(strategy?.is_active)}
        isDraft={!strategy}
        matchScore={strategy?.personality_match ?? matchScore}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <aside className="space-y-4">
          <div>
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
              Templates
            </h2>
            <StrategyTemplateRack
              selectedId={selectedTemplateId}
              onApply={({ rules, philosophy, positionPct, stopLossPct, templateId }) => {
                setSelectedTemplateId(templateId ?? null);
                const parsed: ParsedStrategyLayers = {
                  philosophy,
                  position_sizing: {
                    type: "fixed",
                    value: positionPct ?? 0.1,
                    scale_in: false,
                  },
                  signal_rules: rules.map(({ indicator, condition, threshold, action }) => ({
                    indicator,
                    condition,
                    threshold,
                    action,
                  })),
                  risk_management: {
                    stop_loss_pct: stopLossPct ?? 0.05,
                    take_profit_pct: 0.15,
                    max_drawdown_pct: 0.2,
                  },
                  target_pairs: targetPairs,
                };
                setBuilderSeed(parsed);
                setBuilderKey(`${philosophy}-${Date.now()}`);
                setValidateData(null);
              }}
            />
          </div>

          <PolicyCompatibilityPreview
            validating={validateMutation.isPending}
            policyVersion={validateData?.policy_version ?? strategy?.policy_version}
            policySummary={validateData?.policy_summary ?? strategy?.policy_summary}
            policyCompatible={validateData?.policy_compatible ?? strategy?.policy_compatible}
            allowedPairs={validateData?.allowed_pairs ?? strategy?.allowed_pairs}
            blockedPairs={validateData?.blocked_pairs ?? strategy?.blocked_pairs}
            targetPairs={validateData?.target_pairs ?? strategy?.target_pairs ?? targetPairs}
            conflicts={validateData?.policy_conflicts ?? strategy?.policy_conflicts}
          />

          <GhostInfluenceHint ghost={strategy?.ghost_influence} />
        </aside>

        <section className="space-y-4">
          <StrategyBuilder
            key={builderKey}
            initialParsed={builderSeed ?? strategy?.parsed ?? null}
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
              toast.message("Natural language parsing stays in the dashboard drawer for now");
            }}
          />

          {pandaReaction ? (
            <p className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-[12px] text-primary-600">
              🐼 {pandaReaction}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(true)}
            >
              View validation details
            </Button>
            {strategy?.is_active ? (
              <Link href={trainingLedgerPath(params.id)}>
                <Button size="lg">Start Training</Button>
              </Link>
            ) : (
              <Button size="lg" disabled>
                Save strategy to unlock training
              </Button>
            )}
            <Link href={agentWalletSetupPath(params.id)} className="text-[12px] text-product-muted hover:underline">
              Adjust policy in Agent Wallet
            </Link>
          </div>
        </section>
      </div>

      <Drawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        variant="product"
        title="Validation details"
        description="Parser output and strategy hash stay hidden until you need them."
      >
        <div className="space-y-3 text-[12px]">
          {strategy?.strategy_hash ? (
            <div>
              <p className="font-medium text-neutral-700">Strategy hash</p>
              <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                {strategy.strategy_hash}
              </p>
            </div>
          ) : null}
          {builderSeed || strategy?.parsed ? (
            <div>
              <p className="font-medium text-neutral-700">Parsed rule JSON</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-neutral-100 p-3 text-[10px]">
                {JSON.stringify(builderSeed ?? strategy?.parsed, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-neutral-500">Validate or save a strategy to inspect details.</p>
          )}
        </div>
      </Drawer>
    </ProductPageShell>
  );
}

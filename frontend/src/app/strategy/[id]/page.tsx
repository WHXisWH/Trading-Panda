"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpenText, CheckCircle2, Layers3, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0, DisclosureL1 } from "@/lib/ui/disclosure";
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
import { canOpenTraining, STRATEGY_PAGE_TEMPLATE_IDS } from "@/lib/strategyPage";
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pandaReaction, setPandaReaction] = useState<string | null>(null);

  const { data: panda } = useQuery({
    queryKey: ["panda-detail", params.id, jwt],
    enabled: Boolean(jwt),
    queryFn: () => fetchPandaDetail(jwt!, params.id),
  });

  const { data: strategy } = useQuery({
    queryKey: ["strategy", params.id, jwt],
    enabled: Boolean(jwt),
    queryFn: () => getStrategy(jwt!, params.id),
  });

  const targetPairs = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools).slice(0, 3),
    [panda?.subscribed_pools],
  );

  const activeTemplateCount = STRATEGY_PAGE_TEMPLATE_IDS.length;
  const policySummary = validateData?.policy_summary ?? strategy?.policy_summary ?? null;
  const policyCompatible = validateData?.policy_compatible ?? strategy?.policy_compatible ?? null;
  const allowedPairs = validateData?.allowed_pairs ?? strategy?.allowed_pairs ?? [];
  const blockedPairs = validateData?.blocked_pairs ?? strategy?.blocked_pairs ?? [];
  const conflicts = validateData?.policy_conflicts ?? strategy?.policy_conflicts ?? [];
  const activeParsed = builderSeed ?? strategy?.parsed ?? null;
  const canSave = Boolean(validateData?.valid && validateData.policy_compatible !== false);

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
      setBuilderSeed(data.parsed);
      setBuilderKey(`saved-${data.version}`);
      setWarnings([]);
      setInvalidRuleIndexes([]);
      setValidateData(null);
      void qc.invalidateQueries({ queryKey: ["strategy", params.id] });
      void qc.invalidateQueries({ queryKey: ["panda-detail", params.id] });
      void qc.invalidateQueries({ queryKey: ["panda", params.id] });
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const applyTemplate = (payload: {
    rules: ParsedStrategyLayers["signal_rules"];
    philosophy: ParsedStrategyLayers["philosophy"];
    positionPct?: number;
    stopLossPct?: number;
    templateId?: string;
  }) => {
    const parsed: ParsedStrategyLayers = {
      philosophy: payload.philosophy,
      position_sizing: {
        type: "fixed",
        value: payload.positionPct ?? 0.1,
        scale_in: false,
      },
      signal_rules: payload.rules,
      risk_management: {
        stop_loss_pct: payload.stopLossPct ?? 0.05,
        take_profit_pct: 0.15,
        max_drawdown_pct: 0.2,
      },
      target_pairs: targetPairs,
    };

    setSelectedTemplateId(payload.templateId ?? null);
    setBuilderSeed(parsed);
    setBuilderKey(`${payload.templateId ?? payload.philosophy}-${Date.now()}`);
    setValidateData(null);
    setWarnings([]);
    setInvalidRuleIndexes([]);
  };

  return (
    <ProductPageShell density="medium" className="space-y-6">
      <DisclosureL0
        eyebrow="Feed Strategy"
        title="Teach your Panda what to practice"
        description="Strategy guides decisions inside the active TradingPolicy. It cannot grant more risk or permission."
      >
        <DisclosureL1
          items={[
            {
              label: "Policy",
              value: policyCompatible === false ? "Conflicts" : policyCompatible === true ? "Compatible" : "Preview",
              tone: policyCompatible === false ? "warn" : policyCompatible === true ? "pass" : "default",
            },
            {
              label: "Templates",
              value: `${activeTemplateCount} ready`,
              tone: "default",
            },
            {
              label: "Ghost",
              value: strategy?.ghost_influence ? "Active" : "Clean slate",
              tone: strategy?.ghost_influence ? "warn" : "default",
            },
          ]}
          className="mt-4"
        />
      </DisclosureL0>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[20px] border border-product-line bg-product-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-product-muted">
                  StrategyTemplateRack
                </p>
                <h2 className="mt-1 text-[14px] font-semibold text-product-text">Beginner templates</h2>
              </div>
              <Sparkles className="h-4 w-4 text-product-gold/80" />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-product-muted">
              Pick one template to seed the draft. It replaces your current rule state.
            </p>
            <div className="mt-4">
              <StrategyTemplateRack
                selectedId={selectedTemplateId}
                templateIds={[...STRATEGY_PAGE_TEMPLATE_IDS]}
                onApply={applyTemplate}
              />
            </div>
          </section>

          <section className="rounded-[20px] border border-product-line bg-product-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-product-muted">
                  Current policy
                </p>
                <h2 className="mt-1 text-[14px] font-semibold text-product-text">Compatibility preview</h2>
              </div>
              <Lock className="h-4 w-4 text-product-muted/80" />
            </div>
            <div className="mt-4">
              <PolicyCompatibilityPreview
                theme="product"
                validating={validateMutation.isPending}
                policyVersion={validateData?.policy_version ?? strategy?.policy_version}
                policySummary={policySummary}
                policyCompatible={policyCompatible}
                allowedPairs={allowedPairs}
                blockedPairs={blockedPairs}
                targetPairs={validateData?.target_pairs ?? strategy?.target_pairs ?? targetPairs}
                conflicts={conflicts}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {targetPairs.map((pair) => (
                <span key={pair} className="strategy-feed-chip rounded-full px-2.5 py-1 text-[10px] text-product-muted">
                  {pair}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-product-line bg-product-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-product-muted">
                  Strategy version
                </p>
                <h2 className="mt-1 text-[14px] font-semibold text-product-text">Version + ghost influence</h2>
              </div>
              <Layers3 className="h-4 w-4 text-product-muted/80" />
            </div>
            <div className="mt-4">
              <StrategyVersionBar
                theme="product"
                version={strategy?.version}
                isActive={Boolean(strategy?.is_active)}
                isDraft={!strategy}
                matchScore={strategy?.personality_match ?? matchScore}
              />
            </div>
            <div className="mt-4">
              <GhostInfluenceHint theme="product" ghost={strategy?.ghost_influence} />
              {!strategy?.ghost_influence ? (
                <p className="mt-3 rounded-[18px] bg-black/20 px-4 py-3 text-[12px] text-product-muted">
                  No ghost residue yet. First strategy feed starts with a clean slate.
                </p>
              ) : null}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="rounded-[20px] border border-product-line bg-product-panel p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-product-muted">
                  RuleBlockEditor
                </p>
                <h2 className="mt-1 text-[15px] font-semibold text-product-text">Rule blocks, risk envelope, validation</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="agent-wallet-btn-ghost"
                  onClick={() => setAdvancedOpen(true)}
                >
                  <BookOpenText className="h-3.5 w-3.5" />
                  View validation details
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="agent-wallet-btn-ghost"
                  onClick={() => setDetailsOpen(true)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Strategy data
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <StrategyBuilder
                key={builderKey}
                compact
                showTemplates={false}
                showActions={false}
                initialParsed={activeParsed}
                matchScore={matchScore ?? strategy?.personality_match ?? null}
                warnings={warnings}
                invalidRuleIndexes={invalidRuleIndexes}
                loading={feedMutation.isPending}
                onDraftChange={(parsed) => {
                  setBuilderSeed(parsed);
                }}
                onValidate={(parsed) => validateMutation.mutate(parsed)}
                onSubmit={(parsed) => {
                  if (!canSave) {
                    toast.error("Validate strategy and resolve policy conflicts first");
                    return;
                  }
                  feedMutation.mutate(parsed);
                }}
                onParseText={() => {
                  toast.message("Natural language parsing is folded into the advanced drawer.");
                }}
                theme="product"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-black/20 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-product-muted">
                {selectedTemplateId
                  ? "Template selected. Validate before saving."
                  : "Select a template or edit the current draft."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="agent-wallet-btn-ghost"
                onClick={() => {
                  if (!activeParsed) return;
                  validateMutation.mutate(activeParsed);
                }}
                disabled={!activeParsed}
              >
                Validate strategy
              </Button>
            </div>
          </div>

          {pandaReaction ? (
            <div className="rounded-[20px] border border-product-green/30 bg-product-green/10 px-4 py-3 text-[13px] text-product-text">
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-product-green/85">
                Panda reaction
              </p>
              <p className="mt-2 leading-relaxed">{pandaReaction}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-product-line bg-product-panel px-4 py-3">
            <p className="text-[11px] leading-relaxed text-product-muted">
              {canSave
                ? "Policy check passed. Save to activate on the ledger."
                : "Validate against TradingPolicy before saving to the ledger."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={agentWalletSetupPath(params.id)} className="inline-flex">
                <Button variant="outline" size="sm" className="agent-wallet-btn-ghost">
                  Adjust policy
                </Button>
              </Link>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="agent-wallet-btn-ghost"
                onClick={() => {
                  if (!activeParsed) return;
                  validateMutation.mutate(activeParsed);
                }}
                disabled={!activeParsed}
              >
                Validate strategy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="gold"
                loading={feedMutation.isPending}
                onClick={() => {
                  if (!activeParsed) return;
                  if (!canSave) {
                    toast.error("Validate strategy and resolve policy conflicts first");
                    return;
                  }
                  feedMutation.mutate(activeParsed);
                }}
                disabled={!activeParsed}
              >
                Save strategy
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              {canOpenTraining(Boolean(strategy?.is_active), feedMutation.isSuccess) ? (
                <Link href={trainingLedgerPath(params.id, { feedStrategy: true })} className="inline-flex">
                  <Button type="button" size="sm">
                    Start Training
                  </Button>
                </Link>
              ) : (
                <Button type="button" size="sm" disabled>
                  Save strategy to unlock training
                </Button>
              )}
            </div>
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
        <div className="space-y-4 text-[12px]">
          <div>
            <p className="font-medium text-product-text">Strategy hash</p>
            <p className="mt-1 break-all font-mono text-[11px] text-product-muted">
              {strategy?.strategy_hash ?? "Hidden until save"}
            </p>
          </div>
          {activeParsed ? (
            <div>
              <p className="font-medium text-product-text">Parsed rule JSON</p>
              <pre className="mt-2 max-h-72 overflow-auto rounded-[16px] bg-black/30 p-3 text-[10px] text-product-muted">
                {JSON.stringify(activeParsed, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-product-muted">Validate or save a strategy to inspect details.</p>
          )}
        </div>
      </Drawer>

      <Drawer
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        variant="product"
        title="Validation preview"
        description="The drawer keeps hidden checks and parser detail out of the main task surface."
      >
        <div className="space-y-3 text-[12px]">
          <p className="text-product-muted">
            {policySummary ?? "No policy mirror yet."}
          </p>
          <div className="rounded-[18px] bg-black/25 px-4 py-3">
            <p className="font-medium text-product-text">Compilation status</p>
            <p className="mt-1 text-product-muted">
              {validateData?.valid ? "Strategy compiles cleanly." : "Run Validate strategy to surface field-level errors."}
            </p>
            {warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-product-amber">
                {warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Drawer>
    </ProductPageShell>
  );
}

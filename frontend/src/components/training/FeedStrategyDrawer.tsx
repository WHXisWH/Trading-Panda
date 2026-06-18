"use client";

import { useMemo, useState } from "react";
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
      className="md:w-[min(760px,95vw)]"
      title="Feed strategy"
      description="Teach the Panda what to practice inside the active TradingPolicy."
    >
      <div className="space-y-4">
        <StrategyVersionBar
          version={strategy?.version}
          isActive={Boolean(strategy?.is_active)}
          isDraft={!strategy}
          matchScore={strategy?.personality_match ?? matchScore}
        />

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

        <StrategyBuilder
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

        {pandaReaction ? (
          <p className="rounded-lg border border-product-green/25 bg-product-green/10 px-3 py-2 text-[12px] text-product-green">
            {pandaReaction}
          </p>
        ) : null}

        <GhostInfluenceHint ghost={strategy?.ghost_influence} />

        {strategy?.is_active ? (
          <div className="flex justify-end border-t border-product-line/40 pt-4">
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Return to cockpit
            </Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

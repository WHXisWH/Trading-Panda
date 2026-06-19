"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FeedStrategyEditorPanel } from "@/components/training/FeedStrategyEditorPanel";
import { playbookStyleLabel } from "@/lib/strategyPlaybookSummary";
import { isOrderSizeCompatible } from "@/lib/feedStrategyRiskBudget";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  strategyErrorMessage,
  updateStrategy,
  validateStrategy,
} from "@/services/strategy.service";
import type { ParsedStrategyLayers, StrategyListItem, StrategyValidateData } from "@/types/strategy";

interface FeedStrategyPlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StrategyListItem | null;
  jwt: string;
  pandaId: string;
  targetPairs: string[];
  trainingBudget: number;
  maxNotionalPerTrade?: number | null;
  hasActiveOther: boolean;
  onSaved: () => void;
  onRequestFeed: (
    item: StrategyListItem,
    validateData: StrategyValidateData | null,
    parsed: ParsedStrategyLayers | null,
  ) => void;
}

function withTargetPairs(
  parsed: ParsedStrategyLayers,
  targetPairs: string[],
): ParsedStrategyLayers {
  return {
    ...parsed,
    target_pairs: parsed.target_pairs?.length ? parsed.target_pairs : targetPairs,
  };
}

export function FeedStrategyPlaybookDialog({
  open,
  onOpenChange,
  item,
  jwt,
  pandaId,
  targetPairs,
  trainingBudget,
  maxNotionalPerTrade,
  hasActiveOther,
  onSaved,
  onRequestFeed,
}: FeedStrategyPlaybookDialogProps) {
  const [title, setTitle] = useState("");
  const [parsed, setParsed] = useState<ParsedStrategyLayers | null>(null);
  const [builderKey, setBuilderKey] = useState("playbook");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [validateData, setValidateData] = useState<StrategyValidateData | null>(null);

  const runValidateNow = useCallback(
    (nextParsed: ParsedStrategyLayers) => {
      void validateStrategy(jwt, pandaId, {
        parsed: withTargetPairs(nextParsed, targetPairs),
      })
        .then((data) => {
          setValidateData(data);
          setWarnings(data.warnings);
          setInvalidRuleIndexes(data.invalid_rules.map((r) => r.index));
        })
        .catch(() => setValidateData(null));
    },
    [jwt, pandaId, targetPairs],
  );

  const runValidate = useDebouncedCallback(runValidateNow, 400);

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.raw_text);
    setParsed(withTargetPairs(item.parsed, targetPairs));
    setBuilderKey(`${item.strategy_id}-${Date.now()}`);
    setWarnings([]);
    setInvalidRuleIndexes([]);
    setValidateData(null);
    runValidateNow(item.parsed);
  }, [open, item, targetPairs, runValidateNow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item || !parsed) throw new Error("No playbook to save");
      return updateStrategy(jwt, pandaId, item.strategy_id, {
        raw_text: title.trim() || item.raw_text,
        parsed: withTargetPairs(parsed, targetPairs),
      });
    },
    onSuccess: () => {
      toast.success(item?.is_active ? "Live playbook updated" : "Playbook saved");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  if (!item) return null;

  const styleLabel = parsed ? playbookStyleLabel(parsed.philosophy) : "";
  const canFeed =
    !item.is_active &&
    Boolean(parsed) &&
    isOrderSizeCompatible(
      parsed!,
      trainingBudget,
      maxNotionalPerTrade,
      validateData?.blocked_pairs ?? [],
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      size="lg"
      stackAboveDrawer
      title={title || item.raw_text}
      description={
        item.is_active
          ? `${styleLabel} playbook · Live on the Training Ledger`
          : `${styleLabel} playbook · Saved to your library`
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!item.is_active ? (
            <Button
              type="button"
              size="sm"
              variant="gold"
              disabled={!canFeed}
              onClick={() => onRequestFeed(item, validateData, parsed)}
            >
              Feed Panda
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!parsed}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {parsed ? (
        <div className="max-h-[min(68vh,620px)] overflow-y-auto pr-1">
          <FeedStrategyEditorPanel
          title={title}
          onTitleChange={setTitle}
          humanSummary=""
          parsed={parsed}
          builderKey={builderKey}
          warnings={warnings}
          invalidRuleIndexes={invalidRuleIndexes}
          saving={saveMutation.isPending}
          validateData={validateData}
          trainingBudget={trainingBudget}
          maxNotionalPerTrade={maxNotionalPerTrade}
          showGhostHint={hasActiveOther && !item.is_active}
          isActiveDraft={item.is_active}
          onDraftChange={(next) => {
            setParsed(next);
            runValidate(next);
          }}
          onSave={() => saveMutation.mutate()}
          hideHeader
          hideFooter
        />
        </div>
      ) : null}
    </Modal>
  );
}

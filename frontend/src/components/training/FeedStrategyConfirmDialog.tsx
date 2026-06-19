"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { FeedStrategyRiskBudgetFields } from "@/components/training/FeedStrategyRiskBudgetFields";
import { isOrderSizeCompatible } from "@/lib/feedStrategyRiskBudget";
import type { ParsedStrategyLayers, PolicyConflictDetail } from "@/types/strategy";

interface FeedStrategyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: string;
  activeTitle?: string | null;
  parsed: ParsedStrategyLayers | null;
  trainingBudget: number;
  maxNotionalPerTrade?: number | null;
  policyConflicts?: PolicyConflictDetail[];
  blockedPairs?: string[];
  loading?: boolean;
  onLater: () => void;
  onFeed: () => void;
}

export function FeedStrategyConfirmDialog({
  open,
  onOpenChange,
  title,
  summary,
  activeTitle,
  parsed,
  trainingBudget,
  maxNotionalPerTrade,
  policyConflicts = [],
  blockedPairs = [],
  loading,
  onLater,
  onFeed,
}: FeedStrategyConfirmDialogProps) {
  const canFeed =
    Boolean(parsed) &&
    isOrderSizeCompatible(parsed!, trainingBudget, maxNotionalPerTrade, blockedPairs);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="strategy-feed-confirm-overlay fixed inset-0 bg-black/65 backdrop-blur-[3px]" />
        <Dialog.Content className="strategy-feed-confirm-dialog fixed left-1/2 top-1/2 w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <Dialog.Title className="text-[15px] font-semibold text-product-text">
            Feed this playbook to the Panda?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[12px] leading-relaxed text-product-muted">
            Playbook: {title}
          </Dialog.Description>
          <p className="mt-3 text-[12px] leading-relaxed text-product-text">{summary}</p>

          {parsed ? (
            <FeedStrategyRiskBudgetFields
              className="mt-4"
              parsed={parsed}
              trainingBudget={trainingBudget}
              maxNotionalPerTrade={maxNotionalPerTrade}
              conflicts={policyConflicts}
              blockedPairs={blockedPairs}
              readOnly
            />
          ) : null}

          <ul className="mt-4 space-y-1.5 text-[11px] text-product-muted">
            {activeTitle ? (
              <li>· Replaces the live playbook &ldquo;{activeTitle}&rdquo;</li>
            ) : (
              <li>· After feeding, training can start on the ledger</li>
            )}
            {activeTitle ? <li>· Old habits fade over the next stretch of trades</li> : null}
          </ul>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onLater} disabled={loading}>
              Not now
            </Button>
            <Button type="button" size="sm" variant="gold" onClick={onFeed} loading={loading} disabled={!canFeed}>
              Feed Panda
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { BookOpen, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeedStrategyPlaybookCard } from "@/components/training/FeedStrategyPlaybookCard";
import type { StrategyListItem } from "@/types/strategy";

interface FeedStrategyLibraryRailProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  strategies: StrategyListItem[];
  highlightedId: string | null;
  hasUnsavedDraft: boolean;
  listLoading?: boolean;
  onOpenPlaybook: (item: StrategyListItem) => void;
  onNewDraft: () => void;
  onFeedFromList: (item: StrategyListItem) => void;
}

export function FeedStrategyLibraryRail({
  expanded,
  onExpandedChange,
  strategies,
  highlightedId,
  hasUnsavedDraft,
  listLoading = false,
  onOpenPlaybook,
  onNewDraft,
  onFeedFromList,
}: FeedStrategyLibraryRailProps) {
  const count = strategies.length;
  const activeCount = strategies.filter((item) => item.is_active).length;

  const sortedStrategies = useMemo(() => {
    return [...strategies].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [strategies]);

  return (
    <aside
      className={clsx(
        "strategy-feed-library-rail relative flex shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out",
        expanded ? "w-[min(280px,36vw)]" : "w-12",
      )}
      aria-label="Strategy library"
    >
      <div
        className={clsx(
          "strategy-feed-library-rail__inner flex min-h-0 flex-col",
          expanded
            ? "strategy-feed-library-rail__inner--expanded"
            : "strategy-feed-library-rail__inner--collapsed",
        )}
      >
        <div
          className={clsx(
            "flex shrink-0 items-center gap-2",
            expanded ? "justify-between pb-3" : "flex-col py-2",
          )}
        >
          <button
            type="button"
            onClick={() => onExpandedChange(!expanded)}
            className={clsx(
              "flex items-center justify-center rounded-[12px] text-product-muted transition-colors hover:bg-black/25 hover:text-product-text",
              expanded ? "h-8 w-8" : "h-9 w-9",
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse strategy library" : "Expand strategy library"}
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {expanded ? (
            <>
              <p className="ledger-step-label min-w-0 flex-1">Library</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="agent-wallet-btn-ghost shrink-0"
                onClick={onNewDraft}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </>
          ) : (
            <div className="relative flex flex-col items-center gap-1">
              <BookOpen className="h-4 w-4 text-product-muted" aria-hidden />
              {count > 0 ? (
                <span className="rounded-full bg-product-green/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-product-green">
                  {count}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {expanded ? (
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
            {listLoading && count === 0 ? (
              <p className="px-1 text-[11px] text-product-muted">Syncing playbooks…</p>
            ) : null}

            {hasUnsavedDraft ? (
              <div className="strategy-feed-chip rounded-[14px] px-3 py-2 text-[11px] text-product-gold">
                Unsaved draft in editor
              </div>
            ) : null}

            {count === 0 && !listLoading ? (
              <div className="strategy-feed-ghost rounded-[14px] px-3 py-3 text-[11px] leading-relaxed text-product-muted">
                <p>No playbooks yet.</p>
                <p className="mt-2">Draft with AI, save, and your playbooks will show up here.</p>
              </div>
            ) : null}

            {sortedStrategies.map((item) => (
              <FeedStrategyPlaybookCard
                key={item.strategy_id}
                item={item}
                highlighted={highlightedId === item.strategy_id}
                onOpen={() => onOpenPlaybook(item)}
                onFeed={() => onFeedFromList(item)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-1 flex flex-1 flex-col items-center gap-2 pb-2">
            {activeCount > 0 ? (
              <span
                className="h-2 w-2 rounded-full bg-product-green shadow-[0_0_8px_rgba(74,222,128,0.55)]"
                title="A playbook is live"
              />
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

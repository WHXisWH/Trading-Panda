"use client";

import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import {
  formatRuleLine,
  playbookCardSubtitle,
} from "@/lib/strategyPlaybookSummary";
import type { StrategyListItem } from "@/types/strategy";

interface FeedStrategyPlaybookCardProps {
  item: StrategyListItem;
  highlighted?: boolean;
  onOpen: () => void;
  onFeed: () => void;
}

export function FeedStrategyPlaybookCard({
  item,
  highlighted = false,
  onOpen,
  onFeed,
}: FeedStrategyPlaybookCardProps) {
  const rules = item.parsed.signal_rules.slice(0, 3);
  const isActive = item.is_active;

  return (
    <article
      className={clsx(
        "strategy-feed-playbook-card group rounded-[16px]",
        isActive && "strategy-feed-playbook-card--active",
        highlighted && !isActive && "strategy-feed-playbook-card--preview",
      )}
      aria-current={isActive ? "true" : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className={clsx(
          "flex w-full flex-col gap-2.5 p-3 text-left",
          isActive && "pl-4",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={clsx(
                "truncate text-[13px] font-semibold leading-snug",
                isActive ? "text-product-green" : "text-product-text",
              )}
            >
              {item.raw_text}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-product-muted">
              {playbookCardSubtitle(item.parsed)}
            </p>
          </div>
          {isActive ? (
            <span className="shrink-0 rounded-full border border-product-green/30 bg-product-green/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-product-green">
              In use
            </span>
          ) : null}
        </div>

        <ul className="space-y-1">
          {rules.map((rule, index) => (
            <li
              key={`${rule.indicator}-${rule.action}-${index}`}
              className={clsx(
                "flex items-center gap-2 rounded-[10px] px-2 py-1 text-[11px]",
                rule.action === "BUY"
                  ? "bg-product-green/[0.07] text-product-text"
                  : "bg-product-red/[0.07] text-product-text",
              )}
            >
              <span
                className={clsx(
                  "shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase",
                  rule.action === "BUY" ? "text-product-green" : "text-product-red",
                )}
              >
                {rule.action}
              </span>
              <span className="min-w-0 truncate text-product-muted">
                {formatRuleLine(rule).replace(`${rule.action} when `, "")}
              </span>
            </li>
          ))}
          {item.parsed.signal_rules.length > 3 ? (
            <li className="px-2 text-[10px] text-product-muted">
              +{item.parsed.signal_rules.length - 3} more rule
              {item.parsed.signal_rules.length - 3 === 1 ? "" : "s"}
            </li>
          ) : null}
        </ul>
      </button>

      {isActive ? (
        <div className="strategy-feed-playbook-card__active-row">
          <span className="strategy-feed-playbook-card__active-dot" aria-hidden />
          Panda is using this playbook
        </div>
      ) : (
        <div className="strategy-feed-playbook-card__feed-row rounded-b-[16px] px-3 pb-3 pt-2">
          <Button
            type="button"
            size="sm"
            variant="gold"
            className="h-8 w-full text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              onFeed();
            }}
          >
            Feed Panda
          </Button>
        </div>
      )}
    </article>
  );
}

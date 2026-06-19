"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { FeedStrategyPromptChips } from "@/components/training/FeedStrategyPromptChips";
import { buildParseFailureHints, type StrategyPromptTemplate } from "@/lib/strategyPromptTemplates";

interface FeedStrategyPromptBlockProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onParse: () => void;
  parsing: boolean;
  parseError: string | null;
  templates: StrategyPromptTemplate[];
  activePool: string;
  authorizedPools: string[];
  agentWalletHref: string;
  centered?: boolean;
}

export function FeedStrategyPromptBlock({
  prompt,
  onPromptChange,
  onParse,
  parsing,
  parseError,
  templates,
  activePool,
  authorizedPools,
  agentWalletHref,
  centered = false,
}: FeedStrategyPromptBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const failureHints = buildParseFailureHints(activePool);
  const poolLabel = activePool.replace(/-/g, "/");

  const applyTemplate = (value: string) => {
    onPromptChange(value);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(value.length, value.length);
    });
  };

  const pairPlaceholder = activePool
    ? `Example: buy ${poolLabel} on a sharp dip, sell the bounce, cap size at 10%`
    : "Example: buy on a sharp dip, sell the bounce, cap size at 10%";

  return (
    <div className={centered ? "mx-auto flex w-full max-w-xl flex-col gap-5" : "flex flex-col gap-4"}>
      {centered ? (
        <div className="text-center">
          <h2 className="text-[15px] font-semibold text-product-text">
            Teach your Panda when to buy or sell
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-product-muted">
            Strategy sets signal bias for the active pool
            {activePool ? (
              <>
                {" "}
                <span className="font-mono text-product-green">{poolLabel}</span>
              </>
            ) : null}
            . Personality, experience, and your Agent Wallet collar still decide whether a trade fires.
          </p>
        </div>
      ) : (
        <div>
          <p className="ledger-step-label">
            Natural language
            {activePool ? (
              <span className="ml-2 font-mono text-[10px] text-product-green">{poolLabel}</span>
            ) : null}
          </p>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        surface="inset"
        rows={centered ? 5 : 4}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={pairPlaceholder}
      />

      {templates.length > 0 ? (
        <div className="space-y-2">
          {centered ? (
            <p className="text-center text-[11px] text-product-muted">
              Not sure where to start? Tap a scenario for {poolLabel}, then tweak it.
            </p>
          ) : null}
          <FeedStrategyPromptChips templates={templates} onSelect={applyTemplate} compact={!centered} />
        </div>
      ) : (
        <div className="strategy-feed-ghost rounded-[18px] px-4 py-3 text-[12px] text-product-muted">
          <p>
            {authorizedPools.length === 0
              ? "No authorized pairs yet. Set allowed pairs in Agent Wallet before drafting a playbook."
              : "Select a pool on the chart before drafting a playbook."}
          </p>
          {authorizedPools.length === 0 ? (
            <Link
              href={agentWalletHref}
              className="mt-2 inline-block text-[11px] font-medium text-product-gold underline-offset-2 hover:underline"
            >
              Open Agent Wallet
            </Link>
          ) : null}
        </div>
      )}

      {parseError ? (
        <div className="strategy-feed-ghost rounded-[18px] px-4 py-3 text-[12px]">
          <p className="font-medium text-product-amber">{parseError}</p>
          {failureHints.length > 0 ? (
            <>
              <p className="mt-2 text-product-muted">Try being more specific. For example:</p>
              <ul className="mt-2 space-y-1 text-product-muted">
                {failureHints.slice(0, 3).map((hint) => (
                  <li key={hint} className="leading-relaxed">
                    · {hint}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        className={centered ? "w-full" : "w-full sm:w-auto"}
        onClick={onParse}
        loading={parsing}
        disabled={prompt.trim().length < 10}
      >
        Draft with AI
      </Button>

      {centered && !parseError ? (
        <p className="text-center text-[11px] text-product-muted">
          Review the signal rules after parsing, then save and choose whether to feed the Panda.
        </p>
      ) : null}
    </div>
  );
}

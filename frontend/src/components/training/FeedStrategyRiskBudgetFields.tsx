"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";
import {
  applyOrderSizeUsd,
  isNotionalOverLimit,
  orderSizeUsd,
  parseRiskUsdInput,
  riskFieldConflicts,
} from "@/lib/feedStrategyRiskBudget";
import type { ParsedStrategyLayers, PolicyConflictDetail } from "@/types/strategy";

interface FeedStrategyRiskBudgetFieldsProps {
  parsed: ParsedStrategyLayers;
  trainingBudget: number;
  maxNotionalPerTrade?: number | null;
  conflicts?: PolicyConflictDetail[];
  blockedPairs?: string[];
  disabled?: boolean;
  readOnly?: boolean;
  onParsedChange?: (parsed: ParsedStrategyLayers) => void;
  className?: string;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function FeedStrategyRiskBudgetFields({
  parsed,
  trainingBudget,
  maxNotionalPerTrade,
  conflicts = [],
  blockedPairs = [],
  disabled = false,
  readOnly = false,
  onParsedChange,
  className,
}: FeedStrategyRiskBudgetFieldsProps) {
  const committedOrderUsd = orderSizeUsd(parsed, trainingBudget);
  const [orderText, setOrderText] = useState(String(committedOrderUsd));
  const [isEditing, setIsEditing] = useState(false);
  const parsedRef = useRef(parsed);

  useEffect(() => {
    parsedRef.current = parsed;
  }, [parsed]);

  useEffect(() => {
    if (!readOnly && !isEditing) {
      setOrderText(String(committedOrderUsd));
    }
  }, [committedOrderUsd, isEditing, readOnly]);

  const orderUsd = readOnly ? committedOrderUsd : parseRiskUsdInput(orderText) ?? committedOrderUsd;
  const fieldFlags = riskFieldConflicts(conflicts);
  const orderOver =
    fieldFlags.notional || isNotionalOverLimit(orderUsd, maxNotionalPerTrade ?? null);

  const commitOrder = (raw: string) => {
    const nextUsd = parseRiskUsdInput(raw);
    if (nextUsd == null) {
      setOrderText(String(committedOrderUsd));
      return;
    }
    onParsedChange?.(applyOrderSizeUsd(parsedRef.current, trainingBudget, nextUsd));
  };

  return (
    <section className={clsx("flex flex-col gap-3", className)}>
      <div>
        <p className="ledger-step-label">Per-trade size</p>
        <p className="mt-1 text-[11px] leading-relaxed text-product-muted">
          {readOnly
            ? `Per simulated order on your $${formatUsd(trainingBudget)} ledger.`
            : `How much this playbook spends per simulated order on your $${formatUsd(trainingBudget)} ledger. Daily loss cap lives in Agent Wallet only.`}
        </p>
      </div>

      <div className="block max-w-xs">
        <span className="text-[11px] font-medium text-product-text">Order size per trade</span>
        {readOnly ? (
          <p
            className={clsx(
              "mt-1.5 rounded-[14px] bg-black/25 px-3.5 py-2.5 font-mono text-[13px] font-semibold",
              orderOver ? "text-product-red ring-1 ring-product-red/45" : "text-product-text",
            )}
          >
            ${formatUsd(orderUsd)}
          </p>
        ) : (
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] font-semibold text-product-muted">
              $
            </span>
            <Input
              type="number"
              min={0}
              step={1}
              mono
              surface="inset"
              className={clsx("pl-7", orderOver && "ring-1 ring-product-red/45")}
              disabled={disabled}
              value={orderText}
              onFocus={() => setIsEditing(true)}
              onBlur={() => {
                setIsEditing(false);
                commitOrder(orderText);
              }}
              onChange={(event) => {
                const next = event.target.value;
                setOrderText(next);
                const nextUsd = parseRiskUsdInput(next);
                if (nextUsd != null) {
                  onParsedChange?.(applyOrderSizeUsd(parsedRef.current, trainingBudget, nextUsd));
                }
              }}
            />
          </div>
        )}
        {maxNotionalPerTrade != null ? (
          <p
            className={clsx(
              "mt-1 text-[11px]",
              orderOver ? "text-product-red" : "text-product-muted",
            )}
          >
            {orderOver
              ? readOnly
                ? `Above wallet max ($${formatUsd(maxNotionalPerTrade)}) — edit in playbook details`
                : `Above wallet max ($${formatUsd(maxNotionalPerTrade)})`
              : `Wallet max $${formatUsd(maxNotionalPerTrade)}`}
          </p>
        ) : null}
      </div>

      {blockedPairs.length > 0 ? (
        <p className="text-[11px] text-product-red">
          Trading pair not allowed in Agent Wallet: {blockedPairs.join(", ")}
        </p>
      ) : null}
    </section>
  );
}

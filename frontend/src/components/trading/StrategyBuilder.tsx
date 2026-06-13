"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { StrategyRuleRow } from "@/components/trading/StrategyRuleRow";
import { StrategyTemplates } from "@/components/trading/StrategyTemplates";
import { StrategyTextInput } from "@/components/trading/StrategyTextInput";
import {
  PHILOSOPHY_OPTIONS,
  buildParsedStrategy,
  clientValidateRows,
  newRuleRow,
  parsedToRows,
} from "@/lib/strategyBuilder";
import type { ParsedStrategyLayers, Philosophy, SignalRuleRow } from "@/types/strategy";

interface Props {
  compact?: boolean;
  loading?: boolean;
  matchScore: number | null;
  warnings: string[];
  invalidRuleIndexes: number[];
  onPhilosophyChange?: (p: Philosophy) => void;
  onValidate: (parsed: ParsedStrategyLayers) => void;
  onSubmit: (parsed: ParsedStrategyLayers) => void;
  onParseText: (text: string) => void;
  parseLoading?: boolean;
  initialParsed?: ParsedStrategyLayers | null;
}

export function StrategyBuilder({
  compact = false,
  loading,
  matchScore,
  warnings,
  invalidRuleIndexes,
  onValidate,
  onSubmit,
  onParseText,
  parseLoading,
  initialParsed,
}: Props) {
  const [philosophy, setPhilosophy] = useState<Philosophy>(
    initialParsed?.philosophy ?? "trend_following",
  );
  const [rules, setRules] = useState<SignalRuleRow[]>(
    initialParsed ? parsedToRows(initialParsed) : [newRuleRow(), newRuleRow({ action: "SELL", condition: "> 70", threshold: 70 })],
  );
  const [positionPct, setPositionPct] = useState(
    initialParsed?.position_sizing?.value ?? 0.1,
  );
  const [stopLossPct, setStopLossPct] = useState(
    initialParsed?.risk_management?.stop_loss_pct ?? 0.05,
  );
  const [takeProfitPct, setTakeProfitPct] = useState(
    initialParsed?.risk_management?.take_profit_pct ?? 0.15,
  );
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(
    initialParsed?.risk_management?.max_drawdown_pct ?? 0.2,
  );
  const [llmText, setLlmText] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const parsed = useMemo(
    () =>
      buildParsedStrategy({
        philosophy,
        rules,
        positionPct,
        stopLossPct,
        takeProfitPct,
        maxDrawdownPct,
      }),
    [philosophy, rules, positionPct, stopLossPct, takeProfitPct, maxDrawdownPct],
  );

  const handleValidate = useCallback(() => {
    const errs = clientValidateRows(rules);
    setClientErrors(errs);
    if (errs.length === 0) onValidate(parsed);
  }, [rules, parsed, onValidate]);

  const handleSubmit = useCallback(() => {
    const errs = clientValidateRows(rules);
    setClientErrors(errs);
    if (errs.length === 0) onSubmit(parsed);
  }, [rules, parsed, onSubmit]);

  return (
    <div
      className={`flex min-w-0 max-w-full flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3 ${
        compact ? "overflow-x-hidden" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">Strategy</h3>
        {matchScore != null && (
          <span className="text-[12px] font-medium text-primary-500">
            匹配度 {matchScore}/100
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
        交易哲学
        <Select
          size="sm"
          aria-label="交易哲学"
          value={philosophy}
          onValueChange={(v) => setPhilosophy(v as Philosophy)}
          options={PHILOSOPHY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </label>

      <StrategyTemplates
        hasExistingRules={rules.length > 0}
        onApply={(rows, p) => {
          if (rules.length <= 2) setRules(rows);
          else setRules((prev) => [...prev, ...rows].slice(0, 8));
          setPhilosophy(p);
        }}
      />

      <div className="space-y-2">
        {rules.map((row, index) => (
          <StrategyRuleRow
            key={row.id}
            row={row}
            compact={compact}
            invalid={invalidRuleIndexes.includes(index)}
            onChange={(next) =>
              setRules((prev) => prev.map((r) => (r.id === row.id ? next : r)))
            }
            onRemove={() => setRules((prev) => prev.filter((r) => r.id !== row.id))}
          />
        ))}
        {rules.length < 8 && (
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-primary-500 py-2 text-[12px] text-primary-600 hover:bg-primary-50"
            onClick={() => setRules((prev) => [...prev, newRuleRow()])}
          >
            + Add Rule
          </button>
        )}
      </div>

      <div
        className={`grid gap-3 text-[11px] text-neutral-500 ${
          compact ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <label className="flex flex-col gap-1.5">
          单笔仓位 {(positionPct * 100).toFixed(0)}%
          <Slider
            aria-label="单笔仓位"
            min={1}
            max={25}
            value={Math.round(positionPct * 100)}
            onValueChange={(v) => setPositionPct(v / 100)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          止损 {(stopLossPct * 100).toFixed(0)}%
          <Slider
            aria-label="止损"
            min={1}
            max={30}
            value={Math.round(stopLossPct * 100)}
            onValueChange={(v) => setStopLossPct(v / 100)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          止盈 {(takeProfitPct * 100).toFixed(0)}%
          <Slider
            aria-label="止盈"
            min={5}
            max={50}
            value={Math.round(takeProfitPct * 100)}
            onValueChange={(v) => setTakeProfitPct(v / 100)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          最大回撤 {(maxDrawdownPct * 100).toFixed(0)}%
          <Slider
            aria-label="最大回撤"
            min={5}
            max={50}
            value={Math.round(maxDrawdownPct * 100)}
            onValueChange={(v) => setMaxDrawdownPct(v / 100)}
          />
        </label>
      </div>

      {(warnings.length > 0 || clientErrors.length > 0) && (
        <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {warnings.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
          {clientErrors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}

      <StrategyTextInput
        value={llmText}
        onChange={setLlmText}
        onParse={() => onParseText(llmText)}
        loading={parseLoading}
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={loading}
          onClick={handleValidate}
        >
          试编译
        </Button>
        <Button
          size="sm"
          className="flex-1"
          loading={loading}
          onClick={handleSubmit}
        >
          🐼 Build Strategy
        </Button>
      </div>
    </div>
  );
}

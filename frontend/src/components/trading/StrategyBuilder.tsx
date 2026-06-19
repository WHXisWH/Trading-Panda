"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
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
import {
  strategyAccentClass,
  strategyHeadingClass,
  strategyLabelClass,
  strategyMutedClass,
  strategyPanelClass,
  strategyWarningBoxClass,
  type StrategySurfaceTheme,
} from "@/lib/ui/strategySurfaceTheme";
import type { ParsedStrategyLayers, Philosophy, SignalRuleRow } from "@/types/strategy";

interface Props {
  compact?: boolean;
  loading?: boolean;
  matchScore: number | null;
  warnings: string[];
  invalidRuleIndexes: number[];
  showTemplates?: boolean;
  showActions?: boolean;
  onPhilosophyChange?: (p: Philosophy) => void;
  onDraftChange?: (parsed: ParsedStrategyLayers) => void;
  onValidate: (parsed: ParsedStrategyLayers) => void;
  onSubmit: (parsed: ParsedStrategyLayers) => void;
  onParseText: (text: string) => void;
  parseLoading?: boolean;
  initialParsed?: ParsedStrategyLayers | null;
  theme?: StrategySurfaceTheme;
}

export function StrategyBuilder({
  compact = false,
  loading,
  matchScore,
  warnings,
  invalidRuleIndexes,
  showTemplates = true,
  showActions = true,
  onValidate,
  onSubmit,
  onParseText,
  onDraftChange,
  parseLoading,
  initialParsed,
  theme = "light",
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

  const draftSignature = useMemo(() => JSON.stringify(parsed), [parsed]);
  const lastDraftSignature = useRef<string | null>(null);

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

  useEffect(() => {
    if (lastDraftSignature.current === draftSignature) return;
    lastDraftSignature.current = draftSignature;
    onDraftChange?.(parsed);
  }, [draftSignature, onDraftChange, parsed]);

  const isProduct = theme === "product";

  return (
    <div className={clsx("flex min-w-0 max-w-full flex-col gap-4", strategyPanelClass(theme, compact))}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={strategyHeadingClass(theme)}>Strategy builder</h3>
        {matchScore != null && (
          <span className={clsx("text-[12px] font-medium", strategyAccentClass(theme))}>
            匹配度 {matchScore}/100
          </span>
        )}
      </div>

      <label className={clsx("flex flex-col gap-1.5", strategyLabelClass(theme))}>
        交易哲学
        <Select
          size="sm"
          surface={isProduct ? "inset" : "default"}
          aria-label="交易哲学"
          value={philosophy}
          onValueChange={(v) => setPhilosophy(v as Philosophy)}
          options={PHILOSOPHY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </label>

      {showTemplates ? (
        <StrategyTemplates
          theme={theme}
          hasExistingRules={rules.length > 0}
          onApply={(rows, p, extras) => {
            if (rules.length <= 2) setRules(rows);
            else setRules((prev) => [...prev, ...rows].slice(0, 8));
            setPhilosophy(p);
            if (extras?.positionPct != null) setPositionPct(extras.positionPct);
            if (extras?.stopLossPct != null) setStopLossPct(extras.stopLossPct);
          }}
        />
      ) : null}

      <div className="space-y-2.5">
        {rules.map((row, index) => (
          <StrategyRuleRow
            key={row.id}
            row={row}
            compact={compact}
            theme={theme}
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
            className={clsx(
              "w-full rounded-[14px] py-2.5 text-[12px] transition-colors",
              isProduct
                ? "strategy-feed-add-rule text-product-green"
                : "border border-dashed border-primary-500 text-primary-600 hover:bg-primary-50",
            )}
            onClick={() => setRules((prev) => [...prev, newRuleRow()])}
          >
            + Add Rule
          </button>
        )}
      </div>

      <div
        className={clsx(
          isProduct ? "strategy-feed-risk-panel" : "",
          compact ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3",
        )}
      >
        <label className={clsx("flex flex-col gap-2", strategyLabelClass(theme), isProduct && "strategy-feed-risk-cell")}>
          <span className="flex items-center justify-between gap-2">
            <span>单笔仓位</span>
            <span className={clsx("font-mono text-[11px]", strategyAccentClass(theme))}>
              {(positionPct * 100).toFixed(0)}%
            </span>
          </span>
          <Slider
            variant={isProduct ? "product" : "light"}
            aria-label="单笔仓位"
            min={1}
            max={25}
            value={Math.round(positionPct * 100)}
            onValueChange={(v) => setPositionPct(v / 100)}
          />
        </label>
        <label className={clsx("flex flex-col gap-2", strategyLabelClass(theme), isProduct && "strategy-feed-risk-cell")}>
          <span className="flex items-center justify-between gap-2">
            <span>止损</span>
            <span className={clsx("font-mono text-[11px]", strategyAccentClass(theme))}>
              {(stopLossPct * 100).toFixed(0)}%
            </span>
          </span>
          <Slider
            variant={isProduct ? "product" : "light"}
            aria-label="止损"
            min={1}
            max={30}
            value={Math.round(stopLossPct * 100)}
            onValueChange={(v) => setStopLossPct(v / 100)}
          />
        </label>
        <label className={clsx("flex flex-col gap-2", strategyLabelClass(theme), isProduct && "strategy-feed-risk-cell")}>
          <span className="flex items-center justify-between gap-2">
            <span>止盈</span>
            <span className={clsx("font-mono text-[11px]", strategyAccentClass(theme))}>
              {(takeProfitPct * 100).toFixed(0)}%
            </span>
          </span>
          <Slider
            variant={isProduct ? "product" : "light"}
            aria-label="止盈"
            min={5}
            max={50}
            value={Math.round(takeProfitPct * 100)}
            onValueChange={(v) => setTakeProfitPct(v / 100)}
          />
        </label>
        <label className={clsx("flex flex-col gap-2", strategyLabelClass(theme), isProduct && "strategy-feed-risk-cell")}>
          <span className="flex items-center justify-between gap-2">
            <span>最大回撤</span>
            <span className={clsx("font-mono text-[11px]", strategyAccentClass(theme))}>
              {(maxDrawdownPct * 100).toFixed(0)}%
            </span>
          </span>
          <Slider
            variant={isProduct ? "product" : "light"}
            aria-label="最大回撤"
            min={5}
            max={50}
            value={Math.round(maxDrawdownPct * 100)}
            onValueChange={(v) => setMaxDrawdownPct(v / 100)}
          />
        </label>
      </div>

      {(warnings.length > 0 || clientErrors.length > 0) && (
        <div className={strategyWarningBoxClass(theme)}>
          {warnings.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
          {clientErrors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}

      <StrategyTextInput
        theme={theme}
        value={llmText}
        onChange={setLlmText}
        onParse={() => onParseText(llmText)}
        loading={parseLoading}
      />

      {showActions ? (
        <>
          <div className="flex gap-2 pt-1">
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
              variant={isProduct ? "gold" : "primary"}
              className="flex-1"
              loading={loading}
              onClick={handleSubmit}
            >
              🐼 Build Strategy
            </Button>
          </div>

          {isProduct ? (
            <p className={clsx("text-center text-[10px]", strategyMutedClass(theme))}>
              Validate against TradingPolicy before saving to the ledger.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

"use client";

import * as Slider from "@radix-ui/react-slider";
import { clsx } from "clsx";

const TALENTS = ["全部", "竹林禅心", "黑白视界", "冬眠反弹", "趋势猎手"];

interface Props {
  talent: string;
  onTalentChange: (t: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (v: [number, number]) => void;
  onClear: () => void;
}

export function MarketFilters({
  talent,
  onTalentChange,
  priceRange,
  onPriceRangeChange,
  onClear,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper-card p-4">
      <span className="text-[11px] text-ink-500">天赋</span>
      {TALENTS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTalentChange(t)}
          className={clsx(
            "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
            talent === t
              ? "bg-bamboo-500 text-white"
              : "border border-[var(--color-border)] bg-white text-ink-500 hover:bg-bamboo-50"
          )}
        >
          {t}
        </button>
      ))}
      <div className="ml-auto flex min-w-[200px] flex-1 items-center gap-3 sm:max-w-xs">
        <span className="shrink-0 text-[11px] text-ink-500">价格 0–10 SUI</span>
        <Slider.Root
          className="relative flex h-5 flex-1 touch-none items-center"
          min={0}
          max={10}
          step={0.5}
          value={priceRange}
          onValueChange={(v) => onPriceRangeChange(v as [number, number])}
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-ink-100">
            <Slider.Range className="absolute h-full rounded-full bg-bamboo-500" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-bamboo-500 bg-white shadow" />
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-bamboo-500 bg-white shadow" />
        </Slider.Root>
        <span className="font-mono text-[11px]">
          {priceRange[0]}–{priceRange[1]}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] text-vermillion hover:underline"
      >
        清空
      </button>
    </div>
  );
}

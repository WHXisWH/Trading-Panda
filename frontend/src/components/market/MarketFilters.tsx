"use client";

import * as Slider from "@radix-ui/react-slider";
import { clsx } from "clsx";

const TALENTS = ["All", "Bamboo Zen", "Black & White", "Hibernate", "Trend Hunter"];

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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <span className="text-xs font-medium text-neutral-500">Talent</span>
      {TALENTS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTalentChange(t)}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            talent === t
              ? "bg-primary-500 text-white"
              : "border border-[var(--color-border)] bg-white text-neutral-500 hover:border-primary-200 hover:text-primary-500"
          )}
        >
          {t}
        </button>
      ))}
      <div className="ml-auto flex min-w-[200px] flex-1 items-center gap-3 sm:max-w-xs">
        <span className="shrink-0 text-xs text-neutral-500">Price</span>
        <Slider.Root
          className="relative flex h-5 flex-1 touch-none items-center"
          min={0}
          max={10}
          step={0.5}
          value={priceRange}
          onValueChange={(v) => onPriceRangeChange(v as [number, number])}
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-neutral-200">
            <Slider.Range className="absolute h-full rounded-full bg-primary-500" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-primary-500 bg-white shadow-sm" />
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-primary-500 bg-white shadow-sm" />
        </Slider.Root>
        <span className="font-mono text-xs text-neutral-500">
          {priceRange[0]}–{priceRange[1]} SUI
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
      >
        Clear
      </button>
    </div>
  );
}

"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import { clsx } from "clsx";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Single-thumb slider built on @radix-ui/react-slider — a drop-in replacement
 * for native <input type="range">. Emits a plain number.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={clsx(
        "relative flex h-5 w-full touch-none select-none items-center",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-200">
        <RadixSlider.Range className="absolute h-full rounded-full bg-brand" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block h-4 w-4 rounded-full border-2 border-primary-500 bg-white shadow-sm transition-transform duration-fast ease-smooth hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 active:scale-95"
        aria-label={ariaLabel}
      />
    </RadixSlider.Root>
  );
}

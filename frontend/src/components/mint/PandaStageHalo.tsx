"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

interface PandaStageHaloProps {
  children: ReactNode;
  dimmed?: boolean;
  revealed?: boolean;
  className?: string;
}

/** Black-gold stage atmosphere behind the Panda carousel (page-mint §3). */
export function PandaStageHalo({
  children,
  dimmed = false,
  revealed = false,
  className,
}: PandaStageHaloProps) {
  return (
    <div
      className={clsx(
        "relative flex w-full max-w-md items-center justify-center rounded-2xl p-8 transition-all duration-500",
        "bg-dark-panel ring-1 ring-white/10",
        dimmed && "opacity-80 brightness-75",
        revealed && "ring-primary-500/40 shadow-accent-lg",
        className,
      )}
    >
      <div
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-2xl opacity-60",
          revealed
            ? "bg-[radial-gradient(circle_at_50%_40%,rgba(15,151,61,0.35),transparent_65%)]"
            : "bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.18),transparent_65%)]",
        )}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

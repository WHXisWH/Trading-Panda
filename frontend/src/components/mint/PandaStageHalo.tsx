"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

interface PandaStageHaloProps {
  children: ReactNode;
  dimmed?: boolean;
  revealed?: boolean;
  className?: string;
}

/** Circular mint ritual stage — prototype halo, ring, and floor glow. */
export function PandaStageHalo({
  children,
  dimmed = false,
  revealed = false,
  className,
}: PandaStageHaloProps) {
  return (
    <div
      className={clsx(
        "mint-stage",
        dimmed && "mint-stage--dimmed brightness-90",
        revealed && "mint-stage--revealed",
        className,
      )}
    >
      <div aria-hidden className="mint-stage-halo" />
      <div aria-hidden className="mint-stage-ring" />
      <div aria-hidden className="mint-stage-floor-glow" />
      <div className="relative z-[4] flex h-full w-full items-center justify-center">{children}</div>
    </div>
  );
}

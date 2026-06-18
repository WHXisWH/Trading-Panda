"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { trainingLedgerPath } from "@/lib/ui/routeJump";
import type { RiskStatus } from "@/types/safety";

const HEADLINES: Record<RiskStatus, string> = {
  active: "Active",
  paused: "Paused",
  revoked: "Revoked",
  tightened: "Tightened",
  mirror_syncing: "Syncing",
  no_wallet: "No wallet",
};

const SUBTITLES: Record<RiskStatus, string> = {
  active: "Panda may train and request Chain Proof under your collar.",
  paused: "All execution blocked — Training Ledger and new proofs stop.",
  revoked: "Authorized agent disabled — chain proof signing removed.",
  tightened: "Stricter limits active — policy version incremented.",
  mirror_syncing: "Chain updated — backend mirror catching up; execution held.",
  no_wallet: "Create Agent Wallet before using emergency controls.",
};

const HERO_STYLES: Record<RiskStatus, string> = {
  active:
    "border-product-green/35 bg-[radial-gradient(circle_at_100%_0%,rgba(109,255,144,0.14),transparent_42%)] bg-black/30",
  paused:
    "border-product-red/45 bg-[radial-gradient(circle_at_100%_0%,rgba(255,95,86,0.2),transparent_42%)] bg-[rgba(23,8,7,0.55)] shadow-[0_0_34px_rgba(255,95,86,0.12)]",
  revoked:
    "border-product-red/55 bg-[radial-gradient(circle_at_100%_0%,rgba(255,95,86,0.24),transparent_42%)] bg-[rgba(23,8,7,0.62)] shadow-[0_0_40px_rgba(255,95,86,0.16)]",
  tightened:
    "border-product-amber/40 bg-[radial-gradient(circle_at_100%_0%,rgba(225,186,92,0.16),transparent_42%)] bg-black/30",
  mirror_syncing:
    "border-product-amber/35 bg-[radial-gradient(circle_at_100%_0%,rgba(225,186,92,0.12),transparent_42%)] bg-black/30",
  no_wallet: "border-product-line bg-product-panel-soft",
};

const HEADLINE_COLORS: Record<RiskStatus, string> = {
  active: "text-product-green",
  paused: "text-product-red",
  revoked: "text-product-red",
  tightened: "text-product-amber",
  mirror_syncing: "text-product-amber",
  no_wallet: "text-product-muted",
};

interface Props {
  status: RiskStatus;
  pandaId?: string;
}

export function RiskStatusHero({ status, pandaId }: Props) {
  const showTrainingCta = status === "active" && pandaId;

  return (
    <div
      className={clsx(
        "rounded-[24px] border px-5 py-5 md:px-6 md:py-6",
        HERO_STYLES[status],
        showTrainingCta && "md:flex md:items-end md:justify-between md:gap-6",
      )}
    >
      <div className={clsx(showTrainingCta && "min-w-0 flex-1")}>
        <p
          className={clsx(
            "font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]",
            status === "active" ? "text-product-green/90" : "text-product-red/90",
          )}
        >
          Risk status
        </p>
        <p
          className={clsx(
            "mt-2 font-sans text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.04em]",
            HEADLINE_COLORS[status],
          )}
        >
          {HEADLINES[status]}
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[#e4c5bc]/90">
          {SUBTITLES[status]}
        </p>
        <p className="mt-3 text-[11px] text-product-muted/85">
          You own the collar. The Panda cannot unpause itself or loosen policy.
        </p>
      </div>

      {showTrainingCta ? (
        <div className="mt-5 shrink-0 md:mt-0">
          <Link href={trainingLedgerPath(pandaId)}>
            <Button size="lg" className="w-full md:w-auto">
              Back to Training
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

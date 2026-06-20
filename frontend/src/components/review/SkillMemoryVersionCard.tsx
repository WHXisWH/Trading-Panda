"use client";

import type { SkillMemoryApi, SkillVersionApi } from "@/types/autonomous-wallet";
import { Badge } from "@/components/ui/Badge";

interface SkillMemoryVersionCardProps {
  memory: SkillMemoryApi | null;
  skillVersion: SkillVersionApi | null;
  onViewDiff?: () => void;
}

export function SkillMemoryVersionCard({
  memory,
  skillVersion,
  onViewDiff,
}: SkillMemoryVersionCardProps) {
  if (!memory && !skillVersion) {
    return (
      <section className="ledger-surface border-dashed p-5">
        <p className="text-[13px] text-product-muted">
          Skill memory unchanged — evidence did not support a durable lesson.
        </p>
      </section>
    );
  }

  return (
    <section className="ledger-surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="product-field-label">Skill memory</p>
          <h2 className="mt-1 font-sans text-lg font-black text-product-text">
            Panda learned a durable rule
          </h2>
        </div>
        {memory ? (
          <Badge
            color="#6dff90"
            className="border border-current/20 bg-black/20 font-mono uppercase tracking-wide"
          >
            v{memory.version}
          </Badge>
        ) : null}
      </div>
      {memory ? (
        <>
          <p className="rounded-2xl border border-product-green/20 bg-product-green/[0.055] px-4 py-3 text-[13px] leading-relaxed text-product-text shadow-[inset_0_1px_0_rgba(109,255,144,0.08)]">
            {memory.rule_text}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <span className="rounded-full border border-product-line bg-black/20 px-2.5 py-1 text-product-muted">
              Confidence {(memory.confidence * 100).toFixed(0)}%
            </span>
            <span className="rounded-full border border-product-green/25 bg-product-green/[0.06] px-2.5 py-1 text-product-green">
              {memory.status}
            </span>
          </div>
        </>
      ) : null}
      {skillVersion ? (
        <p className="font-mono text-[11px] text-product-muted">
          Digest {skillVersion.skill_hash.slice(0, 12)}…
        </p>
      ) : null}
      {onViewDiff ? (
        <button
          type="button"
          onClick={onViewDiff}
          className="text-left text-[12px] font-semibold text-product-gold underline-offset-4 transition-colors hover:text-product-green hover:underline"
        >
          View skill diff
        </button>
      ) : null}
    </section>
  );
}

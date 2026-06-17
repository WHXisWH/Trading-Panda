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
      <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-neutral-50/50 p-5">
        <p className="text-[13px] text-neutral-600">
          Skill memory unchanged — evidence did not support a durable lesson.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-sans text-sm font-bold text-neutral-900">Skill memory</h2>
        {memory ? <Badge color="#059669">v{memory.version}</Badge> : null}
      </div>
      {memory ? (
        <>
          <p className="text-[13px] text-neutral-800">{memory.rule_text}</p>
          <p className="text-[12px] text-neutral-500">
            Confidence {(memory.confidence * 100).toFixed(0)}% · {memory.status}
          </p>
        </>
      ) : null}
      {skillVersion ? (
        <p className="font-mono text-[11px] text-neutral-500">
          Digest {skillVersion.skill_hash.slice(0, 12)}…
        </p>
      ) : null}
      {onViewDiff ? (
        <button
          type="button"
          onClick={onViewDiff}
          className="text-[12px] font-medium text-primary-600 hover:underline"
        >
          View skill diff
        </button>
      ) : null}
    </section>
  );
}

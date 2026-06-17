"use client";

import type { HypothesisApi } from "@/types/autonomous-wallet";

interface EvidenceCourtroomProps {
  hypothesis: HypothesisApi;
}

export function EvidenceCourtroom({ hypothesis }: EvidenceCourtroomProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h2 className="font-sans text-sm font-bold text-neutral-900">Evidence courtroom</h2>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Original thesis</p>
        <p className="mt-1 text-[13px] text-neutral-800">{hypothesis.thesis}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EvidenceList title="Confirming" items={hypothesis.confirming_evidence} tone="ok" />
        <EvidenceList
          title="Contradicting"
          items={hypothesis.contradicting_evidence}
          tone="warn"
        />
      </div>
    </section>
  );
}

function EvidenceList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn";
}) {
  return (
    <div
      className={
        tone === "ok"
          ? "rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
          : "rounded-xl border border-amber-100 bg-amber-50/50 p-3"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-[12px] text-neutral-500">None recorded.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[12px] text-neutral-700">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

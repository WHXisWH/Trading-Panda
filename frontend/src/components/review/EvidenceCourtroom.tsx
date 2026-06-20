"use client";

import type { HypothesisApi } from "@/types/autonomous-wallet";

interface EvidenceCourtroomProps {
  hypothesis: HypothesisApi;
}

export function EvidenceCourtroom({ hypothesis }: EvidenceCourtroomProps) {
  return (
    <section className="ledger-surface space-y-5 p-5">
      <div>
        <p className="product-field-label">Evidence courtroom</p>
        <h2 className="mt-1 font-sans text-lg font-black text-product-text">
          Why the Panda learned
        </h2>
      </div>
      <div>
        <p className="product-field-label">Original thesis</p>
        <p className="mt-2 rounded-xl border border-product-line bg-black/20 px-3 py-2 text-[13px] leading-relaxed text-product-text">
          {hypothesis.thesis}
        </p>
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
          ? "rounded-xl border border-product-green/25 bg-product-green/[0.06] p-3 shadow-[inset_0_1px_0_rgba(109,255,144,0.08)]"
          : "rounded-xl border border-product-gold/20 bg-product-gold/[0.045] p-3 shadow-[inset_0_1px_0_rgba(225,186,92,0.06)]"
      }
    >
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-product-muted">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-[12px] text-product-muted">None recorded.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-product-text">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className={tone === "ok" ? "text-product-green" : "text-product-gold"}>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

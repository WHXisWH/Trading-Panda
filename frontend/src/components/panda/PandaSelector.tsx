"use client";

import Link from "next/link";
import { clsx } from "clsx";

interface PandaOption {
  id: string;
  name?: string;
}

interface Props {
  pandas: PandaOption[];
  currentId: string;
  className?: string;
}

export function PandaSelector({ pandas, currentId, className }: Props) {
  if (pandas.length <= 1) return null;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="text-sm text-ink-500">🐾</span>
      <select
        className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-sm"
        value={currentId}
        onChange={(e) => {
          window.location.href = `/dashboard/${e.target.value}`;
        }}
      >
        {pandas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name ?? `熊猫 ${p.id.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  );
}

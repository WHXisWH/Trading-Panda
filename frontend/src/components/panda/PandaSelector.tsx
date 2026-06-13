"use client";

import { clsx } from "clsx";
import { Select } from "@/components/ui/Select";

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
      <Select
        size="sm"
        aria-label="选择熊猫"
        value={currentId}
        onValueChange={(v) => {
          window.location.href = `/dashboard/${v}`;
        }}
        options={pandas.map((p) => ({
          value: p.id,
          label: p.name ?? `熊猫 ${p.id.slice(0, 8)}`,
        }))}
      />
    </div>
  );
}

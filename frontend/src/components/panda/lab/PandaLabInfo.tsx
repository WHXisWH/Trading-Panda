"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  EMOTION_LABELS,
  getGrowthStage,
  getTraitTier,
  getVisualTier,
  type PandaStats,
} from "@/utils/pandaHelper";
import { PERSONALITY_AXES } from "@/lib/personality";

interface PandaLabInfoProps {
  stats: PandaStats;
  shareUrl: string;
  onCopyLink: () => Promise<void>;
}

export function PandaLabInfo({ stats, shareUrl, onCopyLink }: PandaLabInfoProps) {
  const [copied, setCopied] = useState(false);
  const growth = getGrowthStage(stats.experience);

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(stats, null, 2));
    toast.success("已复制 PandaStats JSON");
  }

  async function handleCopyLink() {
    await onCopyLink();
    toast.success("已复制分享链接");
  }

  async function handleCopyJson() {
    await copyJson();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 text-[12px]">
      <div>
        <h2 className="mb-2 text-[13px] font-semibold text-ink-900">映射信息</h2>
        <dl className="space-y-1 text-ink-600">
          <div className="flex justify-between gap-2">
            <dt>成长阶段</dt>
            <dd className="font-mono">{growth}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>情绪层</dt>
            <dd className="font-mono">{EMOTION_LABELS[stats.emotion]}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="mb-1 font-medium text-ink-800">性格 → Tier / 视觉档</h3>
        <ul className="space-y-1 font-mono text-[11px] text-ink-500">
          {PERSONALITY_AXES.map((axis) => {
            const tier = getTraitTier(stats[axis.key]);
            const visual = getVisualTier(tier);
            return (
              <li key={axis.key} className="flex justify-between gap-2">
                <span>{axis.label}</span>
                <span>
                  T{tier} · {visual}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-medium text-ink-800">PandaStats</h3>
        <pre className="max-h-40 overflow-auto rounded-lg bg-paper-card p-2 text-[10px] leading-relaxed">
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg bg-bamboo-600 px-3 py-2 text-[12px] text-white hover:bg-bamboo-700"
        >
          复制分享链接
        </button>
        <button
          type="button"
          onClick={handleCopyJson}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12px] hover:bg-paper-card"
        >
          {copied ? "已复制" : "复制 JSON"}
        </button>
      </div>

      <p className="break-all text-[10px] text-ink-400" title={shareUrl}>
        {shareUrl}
      </p>
    </div>
  );
}

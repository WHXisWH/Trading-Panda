"use client";

import { Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PandaLabControls } from "@/components/panda/lab/PandaLabControls";
import { PandaLabPreview } from "@/components/panda/lab/PandaLabPreview";
import { PandaLabInfo } from "@/components/panda/lab/PandaLabInfo";
import { usePandaLabState } from "@/hooks/usePandaLabState";

function PandaLabContent() {
  const {
    stats,
    hydrated,
    compareStats,
    showCompare,
    mintPreview,
    setMintPreview,
    setAxis,
    setExperience,
    setEmotion,
    applyPreset,
    randomize,
    reset,
    shareUrl,
    copyShareLink,
    snapshotCompare,
    setShowCompare,
  } = usePandaLabState();

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-500">
        加载试装配置…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">熊猫试装实验室</h1>
          <p className="mt-1 max-w-xl text-[13px] text-ink-500">
            无需连接钱包或铸造，实时调试由 PNG 素材分层合成的 Canvas 熊猫。调整滑条后 URL 自动同步，可分享链接。
          </p>
        </div>
        <div className="flex gap-3 text-[13px]">
          <Link href="/panda-lab/rig" className="text-ink-500 hover:underline">
            Rig 标注
          </Link>
          <Link href="/panda-lab/qa" className="text-ink-500 hover:underline">
            视觉验收
          </Link>
          <Link href="/mint" className="text-bamboo-600 hover:underline">
            去铸造 →
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-[12px]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mintPreview}
            onChange={(e) => setMintPreview(e.target.checked)}
            className="accent-bamboo-600"
          />
          显示 Mint 圆预览
        </label>
        <button
          type="button"
          onClick={() => {
            snapshotCompare();
            toast.message("已固定当前造型为对比 A");
          }}
          className="rounded-lg border border-bamboo-400 px-3 py-1 text-bamboo-700 hover:bg-bamboo-50"
        >
          固定对比 A
        </button>
        {showCompare && (
          <button
            type="button"
            onClick={() => setShowCompare(false)}
            className="text-ink-500 hover:underline"
          >
            关闭对比
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(240px,280px)_1fr_minmax(220px,260px)]">
        <aside className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <PandaLabControls
            stats={stats}
            onAxisChange={setAxis}
            onExperienceChange={setExperience}
            onEmotionChange={setEmotion}
            onPreset={applyPreset}
            onRandom={randomize}
            onReset={reset}
          />
        </aside>

        <main className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <PandaLabPreview
            stats={{ ...stats }}
            compareStats={compareStats}
            showCompare={showCompare}
            mintPreview={mintPreview}
          />
        </main>

        <aside className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <PandaLabInfo stats={stats} shareUrl={shareUrl} onCopyLink={copyShareLink} />
        </aside>
      </div>
    </div>
  );
}

export function PandaLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-ink-500">
          加载中…
        </div>
      }
    >
      <PandaLabContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PoolListItem } from "@/components/pools/PoolListItem";
import { PoolConfirmBar } from "@/components/pools/PoolConfirmBar";
import { MOCK_POOLS } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/Skeleton";

const STORAGE_KEY = "trading-panda-selected-pools";

function PoolSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelected(new Set(JSON.parse(saved) as string[]));
      } catch {
        setSelected(new Set(["cetus-btc-sui", "deepbook-sui-usdc"]));
      }
    } else {
      setSelected(new Set(["cetus-btc-sui", "deepbook-sui-usdc"]));
    }
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)));
    toast.success(`已选择 ${selected.size} 个交易池`);
    if (pandaId) router.push(`/dashboard/${pandaId}`);
    else router.push("/");
  };

  return (
    <>
      <PageContainer className="pb-24 pt-8">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-[22px] font-bold">选择交易池</h1>
          <p className="mt-2 text-[13px] text-ink-500">
            选择你的熊猫将交易哪些池子（可多选）
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : MOCK_POOLS.length === 0 ? (
          <p className="text-center text-ink-500">暂无可用交易池</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2.5">
            {MOCK_POOLS.map((pool) => (
              <PoolListItem
                key={pool.id}
                pool={pool}
                selected={selected.has(pool.id)}
                onToggle={() => toggle(pool.id)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <PoolConfirmBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export default function PoolsPage() {
  return (
    <Suspense fallback={<PageContainer className="py-12"><Skeleton className="h-96" /></PageContainer>}>
      <PoolSelectionContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PoolListItem } from "@/components/pools/PoolListItem";
import { PoolConfirmBar } from "@/components/pools/PoolConfirmBar";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  POOLS_PRIMARY_KEY,
  POOLS_STORAGE_KEY,
  maxPoolsFromFocus,
} from "@/lib/pools/catalog";
import {
  isDeepbookPool,
  type DeepbookPool,
} from "@/lib/constants/deepbookPools";
import { fetchPoolCatalog, updatePandaPools } from "@/services/pools.service";

function PoolSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda");
  const { jwt } = useAuth();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ["pool-catalog"],
    queryFn: () => fetchPoolCatalog(),
  });

  const focusParam = searchParams.get("focus");
  const maxPools = focusParam
    ? maxPoolsFromFocus(Number(focusParam) || 50)
    : 2;

  useEffect(() => {
    const saved = localStorage.getItem(POOLS_STORAGE_KEY);
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        setSelected(new Set(ids.filter(isDeepbookPool)));
        return;
      } catch {
        /* fall through */
      }
    }
    setSelected(new Set(["DEEP/SUI"]));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= maxPools) {
        toast.error(`当前专注度最多选择 ${maxPools} 个交易池`);
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (confirming) {
      return;
    }

    const chosen = Array.from(selected).filter(isDeepbookPool) as DeepbookPool[];
    if (chosen.length === 0) {
      toast.error("请至少选择一个交易池");
      return;
    }

    setConfirming(true);
    try {
      localStorage.setItem(POOLS_STORAGE_KEY, JSON.stringify(chosen));
      localStorage.setItem(POOLS_PRIMARY_KEY, chosen[0]);

      if (jwt && pandaId) {
        try {
          await updatePandaPools(jwt, pandaId, {
            subscribed_pools: chosen,
            primary_pool: chosen[0],
          });
          await qc.invalidateQueries({ queryKey: ["panda", pandaId] });
          toast.success(`已保存 ${chosen.length} 个 DeepBook 交易池`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "保存失败");
          return;
        }
      } else {
        toast.success(`已选择 ${chosen.length} 个交易池（本地）`);
      }

      if (pandaId) {
        router.push(`/dashboard/${pandaId}`);
      } else {
        router.push("/");
      }
    } finally {
      setConfirming(false);
    }
  };

  const atMax = selected.size >= maxPools;

  const subtitle = useMemo(
    () =>
      `DeepBook Testnet · 最多可选 ${maxPools} 个池` +
      (focusParam ? `（专注 ${focusParam}）` : ""),
    [focusParam, maxPools],
  );

  return (
    <>
      <PageContainer className="pb-24 pt-8">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-[22px] font-bold">选择交易池</h1>
          <p className="mt-2 text-[13px] text-ink-500">{subtitle}</p>
          {!jwt && (
            <p className="mt-2 text-[12px] text-vermillion">
              未登录：选择仅保存在本机；连接钱包后可同步到熊猫
            </p>
          )}
          {pandaId && (
            <Link
              href={`/dashboard/${pandaId}`}
              className="mt-2 inline-block text-[12px] text-bamboo-500 hover:underline"
            >
              ← 返回训练室
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <p className="text-center text-ink-500">暂无可用 DeepBook 交易池</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2.5">
            {pools.map((pool) => (
              <PoolListItem
                key={pool.id}
                pool={pool}
                selected={selected.has(pool.id)}
                disabled={atMax}
                onToggle={() => toggle(pool.id)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <PoolConfirmBar
        count={selected.size}
        confirming={confirming}
        onClear={() => setSelected(new Set())}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export default function PoolsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-12">
          <Skeleton className="mx-auto h-96 max-w-3xl" />
        </PageContainer>
      }
    >
      <PoolSelectionContent />
    </Suspense>
  );
}

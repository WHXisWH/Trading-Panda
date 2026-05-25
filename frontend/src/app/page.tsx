"use client";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Panda } from "@/types";

const FEATURES = [
  {
    emoji: "🎲",
    title: "链上随机性格",
    desc: "5轴人格由 sui::random 永久刻入链上，铸造后不可更改，稀缺性真实可查。",
  },
  {
    emoji: "🧠",
    title: "AI 决策引擎",
    desc: "8步决策管道：信号 → 情绪偏差 → 策略残影 → 最终评分。每笔交易决策可视化展开。",
  },
  {
    emoji: "📈",
    title: "可验证经验",
    desc: "每50笔交易生成 Merkle Root 并提交 Sui 链，NFT 的成长历史有据可查。",
  },
  {
    emoji: "🌿",
    title: "策略残影",
    desc: "换策略时，旧策略通过 ghost_weight 衰减影响行为，熊猫的记忆是真实的。",
  },
];

export default function LandingPage() {
  const account = useCurrentAccount();
  const { jwt } = useAuth();

  const { data: pandas } = useQuery<Panda[]>({
    queryKey: ["pandas", jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch("/api/pandas", { headers: { Authorization: `Bearer ${jwt}` } }).then(
        (r) => r.json()
      ),
  });

  const hasPandas = pandas && pandas.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background ink wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #4a7c5918 0%, transparent 70%)",
          }}
        />

        <PageContainer className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-col items-center justify-center gap-8 py-24 text-center">
          {/* Panda mascot */}
          <div className="relative">
            <span className="text-[96px] leading-none animate-panda-breathe inline-block">
              🐼
            </span>
          </div>

          <div className="space-y-4 max-w-2xl">
            <h1 className="font-serif text-5xl font-bold text-bamboo-900 leading-tight">
              TradingPanda
            </h1>
            <p className="text-xl text-ink-500 font-light">
              养一只会交易的 AI 熊猫
            </p>
            <p className="text-base text-ink-500 max-w-lg mx-auto leading-relaxed">
              铸造你的专属熊猫 NFT，喂给它交易策略，看它在模拟盘上自主成长。
              性格由链上随机决定，经验 Merkle Root 上链存证。
            </p>
          </div>

          {/* CTA */}
          {account && jwt ? (
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/mint">
                <Button size="lg">🐾 铸造熊猫</Button>
              </Link>
              {hasPandas && (
                <Link href={`/dashboard/${pandas[0].id}`}>
                  <Button size="lg" variant="outline">
                    🏠 我的熊猫 ({pandas.length})
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-500 mt-2">
              连接钱包后即可铸造你的第一只熊猫
            </p>
          )}

          {/* Stats strip */}
          <div className="mt-8 flex flex-wrap gap-8 justify-center text-center">
            {[
              { value: "5轴", label: "链上性格" },
              { value: "8步", label: "决策管道" },
              { value: "7态", label: "情绪系统" },
              { value: "Testnet", label: "Sui 网络" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="font-serif text-2xl font-bold text-bamboo-500">{value}</div>
                <div className="text-xs text-ink-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Features */}
      <section className="border-t border-ink-100 bg-white">
        <PageContainer className="py-20">
          <h2 className="font-serif text-3xl font-bold text-bamboo-900 text-center mb-12">
            为什么选择 TradingPanda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ emoji, title, desc }) => (
              <Card key={title} variant="ink" className="space-y-3">
                <div className="text-3xl">{emoji}</div>
                <h3 className="font-semibold text-bamboo-900">{title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-500">
        <p>
          TradingPanda · Sui Overflow 2026 · 模拟交易，非真实下单
        </p>
      </footer>
    </>
  );
}

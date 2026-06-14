"use client";

import Link from "next/link";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Select } from "@/components/ui/Select";
import { PositionList } from "@/components/trading/PositionList";
import { OrderBook } from "@/components/trading/OrderBook";
import { TradeForm } from "@/components/trading/TradeForm";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { MOCK_POSITIONS, generateOrderBook } from "@/lib/mockData";

export default function TradingPage({ params }: { params: { id: string } }) {
  const { asks, bids } = generateOrderBook();
  const [strategy, setStrategy] = useState("rsi");

  return (
    <PageContainer className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-sans text-[18px] font-bold">交易界面</h1>
        <Link
          href={`/dashboard/${params.id}`}
          className="text-[13px] text-primary-500 hover:underline"
        >
          ← 返回模拟盘
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_224px]">
        <aside className="card-white p-4 lg:max-w-[220px]">
          <PositionList positions={MOCK_POSITIONS} />
          <div className="mt-4 border-t pt-4">
            <p className="text-[11px] font-medium text-neutral-500">策略选择</p>
            <Select
              size="sm"
              aria-label="策略选择"
              className="mt-1"
              value={strategy}
              onValueChange={setStrategy}
              options={[
                { value: "rsi", label: "RSI 超卖反弹" },
                { value: "trend", label: "趋势跟踪" },
              ]}
            />
          </div>
        </aside>

        <section className="card-white space-y-4 p-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-mono text-sm text-neutral-500"> 订单簿 · BTC/USD</h2>
            <span className="font-mono text-xl font-bold">$59,500</span>
            <span className="text-primary-500 text-sm">+2.3%</span>
          </div>
          <OrderBook asks={asks} bids={bids} />
          <div className="border-t pt-3">
            <p className="mb-2 text-[11px] font-medium text-neutral-500">最新成交</p>
            <ul className="space-y-1 font-mono text-[12px]">
              <li>
                <span className="text-neutral-500">15:23</span>{" "}
                <span className="text-primary-500">BUY 🟢</span> $59,500
              </li>
              <li>
                <span className="text-neutral-500">15:22</span>{" "}
                <span className="text-red-600">SELL 🔴</span> $59,480
              </li>
            </ul>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 text-[11px] text-neutral-500">
            <p className="font-medium">交易日志</p>
            <p>15:23 RSI=28 → Buy</p>
            <p>14:50 RSI=45 → 无视</p>
          </div>
        </section>

        <aside className="space-y-4">
          <TradeForm />
          <div className="card-white p-4">
            <TradeHistory items={[]} />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

"use client";

import { clsx } from "clsx";
import type { OrderBookRow } from "@/lib/mockData";

interface Props {
  asks: OrderBookRow[];
  bids: OrderBookRow[];
  midPrice?: number;
}

export function OrderBook({ asks, bids, midPrice = 59500 }: Props) {
  const maxQty = Math.max(...asks.map((a) => a.quantity), ...bids.map((b) => b.quantity));

  return (
    <div className="space-y-2 text-[12px] font-mono">
      <div className="grid grid-cols-3 gap-2 px-2 text-[10px] text-neutral-500">
        <span>价格</span>
        <span className="text-right">数量</span>
        <span className="text-right">总计</span>
      </div>
      {[...asks].reverse().map((row) => (
        <Row key={`a-${row.price}`} row={row} maxQty={maxQty} />
      ))}
      <div className="py-1 text-center text-[11px] text-neutral-500">
        — Spread: ${(asks[0] && bids[0] ? asks[0].price - bids[0].price : 25)} — ${midPrice.toLocaleString()}
      </div>
      {bids.map((row) => (
        <Row key={`b-${row.price}`} row={row} maxQty={maxQty} />
      ))}
    </div>
  );
}

function Row({ row, maxQty }: { row: OrderBookRow; maxQty: number }) {
  const depth = (row.quantity / maxQty) * 100;
  const isAsk = row.side === "ask";
  return (
    <div
      className={clsx(
        "relative grid grid-cols-3 gap-2 px-2 py-0.5 hover:bg-primary-50",
        isAsk ? "text-red-600" : "text-primary-500"
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-y-0 opacity-30",
          isAsk ? "right-0 bg-red-200" : "left-0 bg-green-200"
        )}
        style={{ width: `${depth}%` }}
      />
      <span>{row.price.toLocaleString()}</span>
      <span className="relative text-right">{row.quantity.toFixed(2)}</span>
      <span className="relative text-right text-neutral-500">
        {(row.total / 1000).toFixed(1)}k
      </span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";

interface Props {
  symbol?: string;
  price?: number;
  available?: string;
}

export function TradeForm({
  symbol = "BTC",
  price = 59500,
  available = "$9,950",
}: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [quantity, setQuantity] = useState("0.010");

  const total = (parseFloat(quantity) || 0) * price;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4">
      <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
        <button
          type="button"
          className={clsx(
            "flex-1 py-2 text-sm font-medium",
            side === "buy" ? "bg-primary-500 text-white" : "bg-white text-neutral-500"
          )}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          className={clsx(
            "flex-1 py-2 text-sm font-medium",
            side === "sell" ? "bg-red-600 text-white" : "bg-white text-neutral-500"
          )}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      <div className="flex gap-2">
        {(["limit", "market"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className={clsx(
              "rounded px-2 py-1 text-[11px]",
              orderType === t ? "bg-primary-50 text-primary-500" : "text-neutral-500"
            )}
          >
            {t === "limit" ? "限价" : "市价"}
          </button>
        ))}
      </div>

      {orderType === "limit" && (
        <label className="block text-[11px]">
          <span className="text-neutral-500">价格</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg bg-[var(--color-bg-primary)] px-3 py-2 font-mono text-[13px]"
            defaultValue={price.toLocaleString()}
          />
        </label>
      )}

      <label className="block text-[11px]">
        <span className="text-neutral-500">数量</span>
        <input
          type="text"
          className="mt-1 w-full rounded-lg bg-[var(--color-bg-primary)] px-3 py-2 font-mono text-[13px]"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      <div className="flex gap-1">
        {["25%", "50%", "75%", "100%"].map((pct) => (
          <button
            key={pct}
            type="button"
            className="flex-1 rounded border border-[var(--color-border)] py-1 text-[10px] hover:bg-primary-50"
            onClick={() => {
              const mult = parseInt(pct, 10) / 100;
              setQuantity((0.04 * mult).toFixed(3));
            }}
          >
            {pct}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-[11px]">
        <span className="text-neutral-500">总计</span>
        <span className="font-mono text-lg font-bold">${total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500">
        <span>可用</span>
        <span>{available}</span>
      </div>

      <Button
        className="w-full"
        variant={side === "buy" ? "primary" : "danger"}
      >
        {side === "buy" ? "Buy" : "Sell"} {quantity} {symbol}
      </Button>
    </div>
  );
}

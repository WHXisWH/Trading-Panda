"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, ColorType } from "lightweight-charts";
import { clsx } from "clsx";

const TIMEFRAMES = ["15m", "1h", "4h", "1d"] as const;

interface Props {
  symbol?: string;
  price?: number;
  change24h?: number;
  className?: string;
}

function generateCandles(count = 60, base = 59500) {
  const data = [];
  let price = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = count; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * 200;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 80;
    const low = Math.min(open, close) - Math.random() * 80;
    data.push({
      time: (now - i * 3600) as import("lightweight-charts").UTCTimestamp,
      open,
      high,
      low,
      close,
    });
    price = close;
  }
  return data;
}

export function CandlestickChart({
  symbol = "BTC/USD",
  price = 59500,
  change24h = 2.3,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1h");

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#888",
      },
      grid: {
        vertLines: { color: "#ede8dc" },
        horzLines: { color: "#ede8dc" },
      },
      width: containerRef.current.clientWidth,
      height: 280,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#2d5a3d",
      downColor: "#c23a3a",
      borderVisible: false,
      wickUpColor: "#2d5a3d",
      wickDownColor: "#c23a3a",
    });
    series.setData(generateCandles(80, price));
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [price, timeframe]);

  const isUp = change24h >= 0;

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-mono text-sm text-ink-500">{symbol}</span>
          <span className="ml-3 font-mono text-2xl font-bold">
            ${price.toLocaleString()}
          </span>
          <span
            className={clsx(
              "ml-2 text-sm font-medium",
              isUp ? "text-profit" : "text-loss"
            )}
          >
            {isUp ? "+" : ""}
            {change24h}% 24h
          </span>
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={clsx(
                "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                timeframe === tf
                  ? "bg-bamboo-500 text-white"
                  : "bg-paper-card text-ink-500 hover:bg-bamboo-50"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full rounded-lg border border-[var(--color-border)]" />
      <p className="text-[10px] text-ink-500">Volume · 模拟数据（WebSocket 接入后实时更新）</p>
    </div>
  );
}

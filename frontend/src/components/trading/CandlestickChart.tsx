"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  ColorType,
} from "lightweight-charts";
import { clsx } from "clsx";
import {
  DEEPBOOK_MVP_POOLS,
  type DeepbookPool,
} from "@/lib/constants/deepbookPools";
import { tradesToChartMarkers } from "@/lib/chart/tradeMarkers";
import type { TradeRecordApi } from "@/types/trading";
import type { CandlesResponse, MarketTickPayload } from "@/types/ws";

interface Props {
  pool: DeepbookPool;
  /** Pools the user may switch to (scheme A: `subscribed_pools` only). */
  availablePools?: DeepbookPool[];
  onPoolChange?: (pool: DeepbookPool) => void;
  history?: CandlesResponse | null;
  lastTick?: MarketTickPayload | null;
  historyError?: string | null;
  trades?: TradeRecordApi[];
  className?: string;
}

function candlesFromHistory(history: CandlesResponse | null | undefined): CandlestickData[] {
  if (!history?.candles?.length) {
    return [];
  }
  return history.candles.map((c) => ({
    time: c.t as UTCTimestamp,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }));
}

function volumeFromHistory(history: CandlesResponse | null | undefined): HistogramData[] {
  if (!history?.candles?.length) {
    return [];
  }
  return history.candles.map((c) => ({
    time: c.t as UTCTimestamp,
    value: c.v,
    color: c.c >= c.o ? "rgba(45, 90, 61, 0.35)" : "rgba(194, 58, 58, 0.35)",
  }));
}

export function CandlestickChart({
  pool,
  availablePools = [...DEEPBOOK_MVP_POOLS],
  onPoolChange,
  history,
  lastTick,
  historyError,
  trades = [],
  className,
}: Props) {
  const poolOptions = availablePools.length > 0 ? availablePools : [...DEEPBOOK_MVP_POOLS];
  const canSwitchPools = onPoolChange != null && poolOptions.length > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const displayPrice =
    lastTick?.price ??
    (history?.candles?.length
      ? history.candles[history.candles.length - 1].c
      : undefined);

  const firstClose = history?.candles?.[0]?.c;
  const lastClose = history?.candles?.length
    ? history.candles[history.candles.length - 1].c
    : undefined;
  const changePct =
    firstClose && lastClose && firstClose > 0
      ? ((lastClose - firstClose) / firstClose) * 100
      : 0;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
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
      height: 320,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#2d5a3d",
      downColor: "#c23a3a",
      borderVisible: false,
      wickUpColor: "#2d5a3d",
      wickDownColor: "#c23a3a",
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.28 },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });

    candleSeries.setData(candlesFromHistory(history));
    volumeSeries.setData(volumeFromHistory(history));
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current) {
      return;
    }
    const candles = candlesFromHistory(history);
    const volumes = volumeFromHistory(history);
    if (candles.length > 0) {
      seriesRef.current.setData(candles);
      volumeRef.current.setData(volumes);
      chartRef.current?.timeScale().fitContent();
    }
  }, [history]);

  useEffect(() => {
    const candle = lastTick?.candle;
    if (!seriesRef.current || !volumeRef.current || !candle || !lastTick?.timestamp) {
      return;
    }
    const time = lastTick.timestamp as UTCTimestamp;
    seriesRef.current.update({
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
    volumeRef.current.update({
      time,
      value: candle.volume,
      color:
        candle.close >= candle.open
          ? "rgba(45, 90, 61, 0.35)"
          : "rgba(194, 58, 58, 0.35)",
    });
  }, [lastTick]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }
    const markers = tradesToChartMarkers(trades);
    seriesRef.current.setMarkers(markers);
  }, [trades]);

  const isUp = changePct >= 0;

  return (
    <div className={clsx("flex min-w-0 max-w-full flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {canSwitchPools ? (
            <select
              value={pool}
              onChange={(e) => onPoolChange!(e.target.value as DeepbookPool)}
              className="rounded border border-[var(--color-border)] bg-white px-2 py-1 font-mono text-sm text-ink-700"
              aria-label="交易池"
            >
              {poolOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-mono text-sm font-medium text-ink-700">{pool}</span>
          )}
          {displayPrice != null && (
            <>
              <span className="font-mono text-2xl font-bold">
                {displayPrice < 1
                  ? displayPrice.toPrecision(4)
                  : displayPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span
                className={clsx(
                  "text-sm font-medium",
                  isUp ? "text-profit" : "text-loss",
                )}
              >
                {isUp ? "+" : ""}
                {changePct.toFixed(2)}% 区间
              </span>
            </>
          )}
          {lastTick?.stale && (
            <span className="text-[10px] text-ink-500">（行情延迟）</span>
          )}
        </div>
        <span className="rounded bg-bamboo-50 px-2 py-0.5 text-[10px] text-bamboo-700">
          DeepBook · 1m
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full min-w-0 max-w-full rounded-lg border border-[var(--color-border)]"
      />
      {historyError && (
        <p className="text-[10px] text-loss">K 线加载失败：{historyError}</p>
      )}
      {!historyError && !history?.candles?.length && (
        <p className="text-[10px] text-ink-500">
          等待 DeepBook 行情…（需 market-monitor + Redis）
        </p>
      )}
      {trades.length > 0 && (
        <p className="text-[10px] text-ink-500">
          K 线标记：{trades.length} 笔成交（▲买 ▼卖）
        </p>
      )}
    </div>
  );
}

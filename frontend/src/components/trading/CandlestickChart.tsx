"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type MouseEventParams,
  type UTCTimestamp,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import { clsx } from "clsx";
import {
  DEEPBOOK_MVP_POOLS,
  type DeepbookPool,
} from "@/lib/constants/deepbookPools";
import { Select } from "@/components/ui/Select";
import { tradesToChartMarkers } from "@/lib/chart/tradeMarkers";
import type { TradeRecordApi } from "@/types/trading";
import type { CandlesResponse, MarketInterval, MarketTickPayload, WsConnectionStatus } from "@/types/ws";

interface Props {
  pool: DeepbookPool;
  interval?: MarketInterval;
  onIntervalChange?: (interval: MarketInterval) => void;
  /** Pools the user may switch to (scheme A: `subscribed_pools` only). */
  availablePools?: DeepbookPool[];
  onPoolChange?: (pool: DeepbookPool) => void;
  history?: CandlesResponse | null;
  lastTick?: MarketTickPayload | null;
  marketStatus?: WsConnectionStatus;
  historyLoading?: boolean;
  historyError?: string | null;
  onRefresh?: () => void;
  trades?: TradeRecordApi[];
  className?: string;
}

const INTERVALS: MarketInterval[] = ["1m", "5m", "15m"];

type HoverCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function toChartTime(raw: number | undefined): UTCTimestamp | null {
  if (!raw || !Number.isFinite(raw)) {
    return null;
  }
  return Math.floor(raw > 1e12 ? raw / 1000 : raw) as UTCTimestamp;
}

function candlesFromHistory(history: CandlesResponse | null | undefined): CandlestickData[] {
  if (!history?.candles?.length) {
    return [];
  }
  const candles: CandlestickData[] = [];
  for (const c of history.candles) {
    const time = toChartTime(c.t);
    if (time == null) {
      continue;
    }
    candles.push({
      time,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    });
  }
  return candles;
}

function volumeFromHistory(history: CandlesResponse | null | undefined): HistogramData[] {
  if (!history?.candles?.length) {
    return [];
  }
  const volumes: HistogramData[] = [];
  for (const c of history.candles) {
    const time = toChartTime(c.t);
    if (time == null) {
      continue;
    }
    volumes.push({
      time,
      value: c.v,
      color: c.c >= c.o ? "rgba(45, 90, 61, 0.35)" : "rgba(194, 58, 58, 0.35)",
    });
  }
  return volumes;
}

const MA_FAST_PERIOD = 7;
const MA_SLOW_PERIOD = 25;
const MA_FAST_COLOR = "#d4a017";
const MA_SLOW_COLOR = "#4a6d8c";

function maFromCandles(candles: CandlestickData[], period: number): LineData[] {
  if (candles.length < period) {
    return [];
  }
  const points: LineData[] = [];
  let windowSum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    windowSum += candles[i].close;
    if (i >= period) {
      windowSum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      points.push({ time: candles[i].time, value: windowSum / period });
    }
  }
  return points;
}

function formatPrice(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "--";
  }
  if (Math.abs(value) < 1) {
    return value.toPrecision(5);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatVolume(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "--";
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTime(raw: number | string | undefined): string {
  if (raw == null) {
    return "--";
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) {
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(raw);
}

function statusLabel(status: WsConnectionStatus | undefined): string {
  if (status === "open") return "WSS 已连接";
  if (status === "connecting") return "WSS 连接中";
  if (status === "error") return "WSS 错误";
  if (status === "closed") return "WSS 已断开";
  return "WSS 未连接";
}

function statusClass(status: WsConnectionStatus | undefined): string {
  if (status === "open") return "bg-primary-50 text-primary-600";
  if (status === "connecting") return "bg-[var(--color-warning-bg)] text-neutral-900";
  if (status === "error") return "bg-[var(--color-seal-bg)] text-loss";
  return "bg-neutral-100 text-neutral-500";
}

function isCandlestickData(data: unknown): data is CandlestickData {
  return (
    typeof data === "object" &&
    data !== null &&
    "open" in data &&
    "high" in data &&
    "low" in data &&
    "close" in data
  );
}

export function CandlestickChart({
  pool,
  interval = "1m",
  onIntervalChange,
  availablePools = [...DEEPBOOK_MVP_POOLS],
  onPoolChange,
  history,
  lastTick,
  marketStatus,
  historyLoading,
  historyError,
  onRefresh,
  trades = [],
  className,
}: Props) {
  const poolOptions = availablePools.length > 0 ? availablePools : [...DEEPBOOK_MVP_POOLS];
  const canSwitchPools = onPoolChange != null && poolOptions.length > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const latestPriceLineRef = useRef<IPriceLine | null>(null);
  const maFastRef = useRef<ISeriesApi<"Line"> | null>(null);
  const maSlowRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [hoverCandle, setHoverCandle] = React.useState<HoverCandle | null>(null);
  const [followRealtime, setFollowRealtime] = React.useState(true);
  const [showMa, setShowMa] = React.useState(true);

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
  const candleCount = history?.candles?.length ?? 0;
  const lastTickAgeSec =
    lastTick?.timestamp != null
      ? Math.max(0, Math.floor(Date.now() / 1000 - (lastTick.timestamp > 1e12 ? lastTick.timestamp / 1000 : lastTick.timestamp)))
      : null;
  const visibleCandle = hoverCandle ?? (
    history?.candles?.length
      ? {
          time: formatTime(history.candles[history.candles.length - 1].t),
          open: history.candles[history.candles.length - 1].o,
          high: history.candles[history.candles.length - 1].h,
          low: history.candles[history.candles.length - 1].l,
          close: history.candles[history.candles.length - 1].c,
          volume: history.candles[history.candles.length - 1].v,
        }
      : null
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#777",
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(45, 90, 61, 0.35)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(45, 90, 61, 0.25)", style: LineStyle.Dashed },
      },
      grid: {
        vertLines: { color: "rgba(237, 232, 220, 0.75)" },
        horzLines: { color: "rgba(237, 232, 220, 0.75)" },
      },
      rightPriceScale: {
        borderColor: "#ede8dc",
      },
      timeScale: {
        borderColor: "#ede8dc",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 420,
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

    const maFastSeries = chart.addLineSeries({
      color: MA_FAST_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const maSlowSeries = chart.addLineSeries({
      color: MA_SLOW_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const initialCandles = candlesFromHistory(history);
    candleSeries.setData(initialCandles);
    volumeSeries.setData(volumeFromHistory(history));
    maFastSeries.setData(maFromCandles(initialCandles, MA_FAST_PERIOD));
    maSlowSeries.setData(maFromCandles(initialCandles, MA_SLOW_PERIOD));
    chart.timeScale().fitContent();

    const handleCrosshair = (param: MouseEventParams) => {
      const candle = param.seriesData.get(candleSeries);
      if (!param.time || !isCandlestickData(candle)) {
        setHoverCandle(null);
        return;
      }
      const volume = volumeRef.current
        ? param.seriesData.get(volumeRef.current)
        : undefined;
      setHoverCandle({
        time: formatTime(param.time as number),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume:
          typeof volume === "object" && volume !== null && "value" in volume
            ? Number(volume.value)
            : undefined,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    maFastRef.current = maFastSeries;
    maSlowRef.current = maSlowSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 420,
        });
      }
    });
    ro.observe(containerRef.current);
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshair);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
      maFastRef.current = null;
      maSlowRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current) {
      return;
    }
    const candles = candlesFromHistory(history);
    const volumes = volumeFromHistory(history);
    seriesRef.current.setData(candles);
    volumeRef.current.setData(volumes);
    maFastRef.current?.setData(showMa ? maFromCandles(candles, MA_FAST_PERIOD) : []);
    maSlowRef.current?.setData(showMa ? maFromCandles(candles, MA_SLOW_PERIOD) : []);
    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [history, showMa]);

  useEffect(() => {
    const candle = lastTick?.candle;
    if (!seriesRef.current || !volumeRef.current || !candle || !lastTick?.timestamp) {
      return;
    }
    const time = toChartTime(lastTick.timestamp);
    if (time == null) {
      return;
    }
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
    if (followRealtime) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [lastTick]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }
    const markers = tradesToChartMarkers(trades);
    seriesRef.current.setMarkers(markers);
  }, [trades]);

  useEffect(() => {
    if (!seriesRef.current || displayPrice == null) {
      return;
    }
    if (latestPriceLineRef.current) {
      seriesRef.current.removePriceLine(latestPriceLineRef.current);
    }
    latestPriceLineRef.current = seriesRef.current.createPriceLine({
      price: displayPrice,
      color: "#4a6d8c",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "last",
    });
  }, [displayPrice]);

  const maLegend = React.useMemo(() => {
    const candles = candlesFromHistory(history);
    const fast = maFromCandles(candles, MA_FAST_PERIOD);
    const slow = maFromCandles(candles, MA_SLOW_PERIOD);
    if (fast.length === 0) {
      return null;
    }
    return {
      fast: fast[fast.length - 1].value,
      slow: slow.length > 0 ? slow[slow.length - 1].value : undefined,
    };
  }, [history]);

  const isUp = changePct >= 0;
  const hasCandles = candleCount > 0;
  const showOverlay = historyLoading || historyError || !hasCandles;

  return (
    <section className={clsx("flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-white", className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-neutral-100 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            {canSwitchPools ? (
              <Select
                size="sm"
                aria-label="交易池"
                className="w-auto font-mono"
                value={pool}
                onValueChange={(v) => onPoolChange!(v as DeepbookPool)}
                options={poolOptions.map((p) => ({ value: p, label: p }))}
              />
            ) : (
              <span className="font-mono text-sm font-medium text-neutral-900">{pool}</span>
            )}
            <span className={clsx("rounded px-2 py-1 text-[10px]", statusClass(marketStatus))}>
              {statusLabel(marketStatus)}
            </span>
          </div>
          <span className="font-mono text-[24px] font-bold leading-none text-neutral-900">
            {formatPrice(displayPrice)}
          </span>
          <span
            className={clsx(
              "text-sm font-medium",
              isUp ? "text-profit" : "text-loss",
            )}
          >
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
          {lastTickAgeSec != null && (
            <span className="text-[10px] text-neutral-500">
              tick {lastTickAgeSec}s 前
            </span>
          )}
          {lastTick?.stale && (
            <span className="rounded bg-[var(--color-warning-bg)] px-2 py-0.5 text-[10px] text-neutral-900">
              行情延迟
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex overflow-hidden rounded border border-[var(--color-border)] bg-white">
            {INTERVALS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onIntervalChange?.(item)}
                className={clsx(
                  "h-8 px-2.5 font-mono text-[11px]",
                  item === interval
                    ? "bg-primary-500 text-white"
                    : "text-neutral-500 hover:bg-primary-50",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              chartRef.current?.timeScale().fitContent();
            }}
            className="h-8 rounded border border-[var(--color-border)] bg-white px-2 text-[11px] text-ink-600 hover:bg-primary-50"
          >
            适配
          </button>
          <button
            type="button"
            onClick={() => setShowMa((v) => !v)}
            className={clsx(
              "h-8 rounded border px-2 text-[11px]",
              showMa
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-[var(--color-border)] bg-white text-neutral-500 hover:bg-primary-50",
            )}
          >
            MA
          </button>
          <button
            type="button"
            onClick={() => setFollowRealtime((v) => !v)}
            className={clsx(
              "h-8 rounded border px-2 text-[11px]",
              followRealtime
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-[var(--color-border)] bg-white text-neutral-500 hover:bg-primary-50",
            )}
          >
            实时
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={historyLoading}
            className="h-8 rounded border border-[var(--color-border)] bg-white px-2 text-[11px] text-ink-600 hover:bg-primary-50 disabled:opacity-50"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] px-3 py-2 text-[11px] text-neutral-500">
        <span>{visibleCandle?.time ?? "等待数据"}</span>
        <span>O <b className="font-mono text-neutral-900">{formatPrice(visibleCandle?.open)}</b></span>
        <span>H <b className="font-mono text-profit">{formatPrice(visibleCandle?.high)}</b></span>
        <span>L <b className="font-mono text-loss">{formatPrice(visibleCandle?.low)}</b></span>
        <span>C <b className="font-mono text-neutral-900">{formatPrice(visibleCandle?.close)}</b></span>
        <span>V <b className="font-mono text-neutral-900">{formatVolume(visibleCandle?.volume)}</b></span>
        {showMa && maLegend && (
          <>
            <span style={{ color: MA_FAST_COLOR }}>
              MA{MA_FAST_PERIOD} <b className="font-mono">{formatPrice(maLegend.fast)}</b>
            </span>
            <span style={{ color: MA_SLOW_COLOR }}>
              MA{MA_SLOW_PERIOD} <b className="font-mono">{formatPrice(maLegend.slow)}</b>
            </span>
          </>
        )}
        <span className="ml-auto">DeepBook · {interval} · {candleCount} bars</span>
      </div>

      <div className="relative min-h-[360px] md:min-h-[440px] xl:min-h-[52dvh]">
        <div ref={containerRef} className="absolute inset-0 min-w-0 max-w-full" />
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 px-4">
            <div className="max-w-sm rounded-lg border border-[var(--color-border)] bg-white/95 px-4 py-3 text-center shadow-sm">
              <p className="text-sm font-semibold text-ink-800">
                {historyLoading
                  ? "正在加载 K 线"
                  : historyError
                    ? "K 线数据不可用"
                    : "等待 DeepBook K 线"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                {historyLoading
                  ? "正在从 market-monitor 拉取历史 candles。"
                  : historyError
                    ? historyError
                    : "需要 market-monitor 连接 DeepBook 并提供 candles；有实时 tick 后图表会继续更新。"}
              </p>
            </div>
          </div>
        )}
      </div>

      {(historyError || trades.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] px-3 py-2 text-[10px] text-neutral-500">
          {historyError && <span className="text-loss">REST candles: error</span>}
          {trades.length > 0 && <span>K 线标记：{trades.length} 笔 Panda 成交</span>}
        </div>
      )}
    </section>
  );
}

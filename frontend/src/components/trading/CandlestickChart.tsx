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
import { Select } from "@/components/ui/Select";
import { MARKET_INTERVAL_OPTIONS } from "@/lib/market/chartIntervals";
import { tradesToChartMarkers } from "@/lib/chart/tradeMarkers";
import type { TradeRecordApi } from "@/types/trading";
import type { CandlesResponse, MarketInterval, MarketTickPayload, WsConnectionStatus } from "@/types/ws";

type ChartVariant = "light" | "product";

interface Props {
  pool: string;
  interval?: MarketInterval;
  onIntervalChange?: (interval: MarketInterval) => void;
  /** Pools the user may switch to (Agent Wallet `allowed_pairs`). */
  availablePools?: string[];
  onPoolChange?: (pool: string) => void;
  /** When false, pool switcher is rendered externally (e.g. Training Ledger header row). */
  showPoolSelector?: boolean;
  /** When false, interval switcher is rendered externally. */
  showIntervalSelector?: boolean;
  history?: CandlesResponse | null;
  lastTick?: MarketTickPayload | null;
  marketStatus?: WsConnectionStatus;
  historyLoading?: boolean;
  historyError?: string | null;
  onRefresh?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  trades?: TradeRecordApi[];
  className?: string;
  variant?: ChartVariant;
}

const CHART_THEMES: Record<
  ChartVariant,
  {
    layout: { background: string; textColor: string };
    grid: { vertLines: string; horzLines: string };
    borderColor: string;
    crosshair: { vertLine: string; horzLine: string };
    upColor: string;
    downColor: string;
    volumeUp: string;
    volumeDown: string;
  }
> = {
  light: {
    layout: { background: "#ffffff", textColor: "#777" },
    grid: { vertLines: "rgba(237, 232, 220, 0.75)", horzLines: "rgba(237, 232, 220, 0.75)" },
    borderColor: "#ede8dc",
    crosshair: {
      vertLine: "rgba(45, 90, 61, 0.35)",
      horzLine: "rgba(45, 90, 61, 0.25)",
    },
    upColor: "#2d5a3d",
    downColor: "#c23a3a",
    volumeUp: "rgba(45, 90, 61, 0.35)",
    volumeDown: "rgba(194, 58, 58, 0.35)",
  },
  product: {
    layout: { background: "#0a0c0a", textColor: "#8a9a8a" },
    grid: { vertLines: "rgba(225, 186, 92, 0.08)", horzLines: "rgba(225, 186, 92, 0.08)" },
    borderColor: "rgba(225, 186, 92, 0.15)",
    crosshair: {
      vertLine: "rgba(109, 255, 144, 0.35)",
      horzLine: "rgba(109, 255, 144, 0.25)",
    },
    upColor: "#6dff90",
    downColor: "#ff6b6b",
    volumeUp: "rgba(109, 255, 144, 0.28)",
    volumeDown: "rgba(255, 107, 107, 0.28)",
  },
};

const LOAD_MORE_THRESHOLD = 25;

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

function statusClass(status: WsConnectionStatus | undefined, isProduct: boolean): string {
  if (status === "open") {
    return isProduct
      ? "border border-product-green/30 bg-product-green/10 text-product-green"
      : "bg-primary-50 text-primary-600";
  }
  if (status === "connecting") {
    return isProduct
      ? "border border-product-amber/30 bg-product-amber/10 text-product-amber"
      : "bg-[var(--color-warning-bg)] text-neutral-900";
  }
  if (status === "error") {
    return isProduct
      ? "border border-product-red/30 bg-product-red/10 text-product-red"
      : "bg-[var(--color-seal-bg)] text-loss";
  }
  return isProduct
    ? "border border-product-line bg-product-panel-soft text-product-muted"
    : "bg-neutral-100 text-neutral-500";
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
  availablePools = [],
  onPoolChange,
  showPoolSelector = true,
  showIntervalSelector = true,
  history,
  lastTick,
  marketStatus,
  historyLoading,
  historyError,
  onRefresh,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  trades = [],
  className,
  variant = "light",
}: Props) {
  const isProduct = variant === "product";
  const theme = CHART_THEMES[variant];
  const poolOptions = availablePools.length > 0 ? availablePools : [pool];
  const canSwitchPools =
    showPoolSelector && onPoolChange != null && poolOptions.length > 1;
  const canSwitchInterval = showIntervalSelector && onIntervalChange != null;
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
  const rangeRef = useRef<{ oldest: number | null; newest: number | null }>({
    oldest: null,
    newest: null,
  });
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  onLoadMoreRef.current = onLoadMore;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

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
        background: { type: ColorType.Solid, color: theme.layout.background },
        textColor: theme.layout.textColor,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: theme.crosshair.vertLine, style: LineStyle.Dashed },
        horzLine: { color: theme.crosshair.horzLine, style: LineStyle.Dashed },
      },
      grid: {
        vertLines: { color: theme.grid.vertLines },
        horzLines: { color: theme.grid.horzLines },
      },
      rightPriceScale: {
        borderColor: theme.borderColor,
      },
      timeScale: {
        borderColor: theme.borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 420,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: theme.upColor,
      downColor: theme.downColor,
      borderVisible: false,
      wickUpColor: theme.upColor,
      wickDownColor: theme.downColor,
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
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (
        !range ||
        range.from == null ||
        !hasMoreRef.current ||
        loadingMoreRef.current
      ) {
        return;
      }
      if (range.from < LOAD_MORE_THRESHOLD) {
        onLoadMoreRef.current?.();
      }
    });

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
  }, [theme]);

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
    const oldestTime = candles[0]?.time;
    const newestTime = candles[candles.length - 1]?.time;
    const oldest = typeof oldestTime === "number" ? oldestTime : null;
    const newest = typeof newestTime === "number" ? newestTime : null;
    const prev = rangeRef.current;
    const isPrepend =
      prev.oldest != null &&
      oldest != null &&
      oldest < prev.oldest &&
      newest === prev.newest;
    if (candles.length > 0 && !isPrepend) {
      chartRef.current?.timeScale().fitContent();
    }
    rangeRef.current = { oldest, newest };
  }, [history, showMa]);

  useEffect(() => {
    const candle = lastTick?.candle;
    if (
      interval !== "1m" ||
      !seriesRef.current ||
      !volumeRef.current ||
      !candle ||
      !lastTick?.timestamp
    ) {
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
      color: candle.close >= candle.open ? theme.volumeUp : theme.volumeDown,
    });
    if (followRealtime) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [interval, lastTick, theme]);

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
    <section
      className={clsx(
        "flex min-w-0 max-w-full flex-col overflow-hidden",
        isProduct
          ? "bg-transparent"
          : "rounded-lg border border-[var(--color-border)] bg-white",
        className,
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 flex-wrap items-center justify-between gap-3 px-3 py-2",
          isProduct
            ? "border-b border-product-line/60"
            : "border-b border-[var(--color-border)] bg-neutral-100",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            {canSwitchPools ? (
              <Select
                size="sm"
                aria-label="交易池"
                className="w-auto font-mono"
                value={pool}
                onValueChange={(v) => onPoolChange!(v)}
                options={poolOptions.map((p) => ({ value: p, label: p }))}
              />
            ) : (
              <span
                className={clsx(
                  "font-mono text-sm font-medium",
                  isProduct ? "text-product-gold" : "text-neutral-900",
                )}
              >
                {pool}
              </span>
            )}
            <span className={clsx("rounded px-2 py-1 text-[10px]", statusClass(marketStatus, isProduct))}>
              {statusLabel(marketStatus)}
            </span>
          </div>
          <span
            className={clsx(
              "font-mono text-[24px] font-bold leading-none",
              isProduct ? "text-product-text" : "text-neutral-900",
            )}
          >
            {formatPrice(displayPrice)}
          </span>
          <span
            className={clsx(
              "text-sm font-medium",
              isUp
                ? isProduct
                  ? "text-product-green"
                  : "text-profit"
                : isProduct
                  ? "text-product-red"
                  : "text-loss",
            )}
          >
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
          {lastTickAgeSec != null && (
            <span className="text-[10px] text-product-muted">
              tick {lastTickAgeSec}s ago
            </span>
          )}
          {lastTick?.stale && (
            <span
              className={clsx(
                "rounded px-2 py-0.5 text-[10px]",
                isProduct
                  ? "border border-product-amber/30 bg-product-amber/10 text-product-amber"
                  : "bg-[var(--color-warning-bg)] text-neutral-900",
              )}
            >
              Stale tick
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canSwitchInterval ? (
            <Select
              size="sm"
              aria-label="Candle interval"
              className={clsx(
                "ledger-chart-select w-auto font-mono",
              )}
              value={interval}
              onValueChange={(value) => onIntervalChange!(value as MarketInterval)}
              options={MARKET_INTERVAL_OPTIONS}
            />
          ) : null}
          <ChartToolButton isProduct={isProduct} active={showMa} onClick={() => setShowMa((v) => !v)}>
            MA
          </ChartToolButton>
          <ChartToolButton
            isProduct={isProduct}
            active={followRealtime}
            onClick={() => setFollowRealtime((v) => !v)}
          >
            Live
          </ChartToolButton>
          <ChartToolButton
            isProduct={isProduct}
            onClick={onRefresh}
            disabled={historyLoading}
          >
            Refresh
          </ChartToolButton>
        </div>
      </div>

      <div
        className={clsx(
          "flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-[11px]",
          isProduct
            ? "border-product-line/60 text-product-muted"
            : "border-[var(--color-border)] text-neutral-500",
        )}
      >
        <span>{visibleCandle?.time ?? "Waiting for data"}</span>
        <span>
          O{" "}
          <b className={clsx("font-mono", isProduct ? "text-product-text" : "text-neutral-900")}>
            {formatPrice(visibleCandle?.open)}
          </b>
        </span>
        <span>
          H{" "}
          <b className={clsx("font-mono", isProduct ? "text-product-green" : "text-profit")}>
            {formatPrice(visibleCandle?.high)}
          </b>
        </span>
        <span>
          L{" "}
          <b className={clsx("font-mono", isProduct ? "text-product-red" : "text-loss")}>
            {formatPrice(visibleCandle?.low)}
          </b>
        </span>
        <span>
          C{" "}
          <b className={clsx("font-mono", isProduct ? "text-product-text" : "text-neutral-900")}>
            {formatPrice(visibleCandle?.close)}
          </b>
        </span>
        <span>
          V{" "}
          <b className={clsx("font-mono", isProduct ? "text-product-text" : "text-neutral-900")}>
            {formatVolume(visibleCandle?.volume)}
          </b>
        </span>
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
        <span className="ml-auto">
          DeepBook · {interval} · {candleCount} bars
          {loadingMore ? " · loading…" : hasMore ? " · scroll for more" : " · 1y max"}
        </span>
      </div>

      <div className="relative min-h-[360px] md:min-h-[440px] xl:min-h-[52dvh]">
        <div ref={containerRef} className="absolute inset-0 min-w-0 max-w-full" />
        {showOverlay && (
          <div
            className={clsx(
              "pointer-events-none absolute inset-0 flex items-center justify-center px-4",
              isProduct ? "bg-black/50" : "bg-white/70",
            )}
          >
            <div
              className={clsx(
                "max-w-sm rounded-xl px-4 py-3 text-center shadow-sm",
                isProduct
                  ? "border border-product-line bg-product-panel"
                  : "rounded-lg border border-[var(--color-border)] bg-white/95",
              )}
            >
              <p
                className={clsx(
                  "text-sm font-semibold",
                  isProduct ? "text-product-text" : "text-ink-800",
                )}
              >
                {historyLoading
                  ? "Loading candles"
                  : historyError
                    ? "Candle data unavailable"
                    : "Waiting for DeepBook candles"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-product-muted">
                {historyLoading
                  ? "Pulling historical candles from market-monitor."
                  : historyError
                    ? historyError
                    : "Market-monitor must publish candles; live ticks will update the chart."}
              </p>
            </div>
          </div>
        )}
      </div>

      {(historyError || trades.length > 0) && (
        <div
          className={clsx(
            "flex flex-wrap items-center gap-3 border-t px-3 py-2 text-[10px]",
            isProduct
              ? "border-product-line/60 text-product-muted"
              : "border-[var(--color-border)] text-neutral-500",
          )}
        >
          {historyError && (
            <span className={isProduct ? "text-product-red" : "text-loss"}>
              REST candles: error
            </span>
          )}
          {trades.length > 0 && <span>Chart markers: {trades.length} Panda trades</span>}
        </div>
      )}
    </section>
  );
}

function ChartToolButton({
  isProduct,
  active,
  disabled,
  onClick,
  children,
}: {
  isProduct: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (isProduct) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          "product-toggle-chip !px-2.5 !py-1.5 !text-[10px]",
          active && "product-toggle-chip-active",
          disabled && "opacity-50",
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "h-8 rounded border px-2 text-[11px]",
        active
          ? "border-primary-500 bg-primary-50 text-primary-600"
          : "border-[var(--color-border)] bg-white text-neutral-500 hover:bg-primary-50",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}

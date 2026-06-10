"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType } from "lightweight-charts";
import type { EquityPoint } from "@/lib/trading/performanceMetrics";
import { formatUsd, formatPct } from "@/lib/trading/performanceMetrics";

interface Props {
  points: EquityPoint[];
  initialCapital: number;
  className?: string;
}

export function EquityCurve({ points, initialCapital, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const drawdownSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const currentEquity = points.length > 0 ? points[points.length - 1].equity : initialCapital;
  const pnl = currentEquity - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  const maxDrawdown = Math.max(...points.map((p) => p.drawdown), 0);
  const isProfit = pnl >= 0;

  const equityData = useMemo(
    () =>
      points.map((p) => ({
        time: Math.floor(p.timestamp / 1000) as unknown as import("lightweight-charts").UTCTimestamp,
        value: p.equity,
      })),
    [points],
  );

  const drawdownData = useMemo(
    () =>
      points.map((p) => ({
        time: Math.floor(p.timestamp / 1000) as unknown as import("lightweight-charts").UTCTimestamp,
        value: -p.drawdown,
        color: p.drawdown > 5 ? "rgba(194, 58, 58, 0.6)" : "rgba(194, 58, 58, 0.3)",
      })),
    [points],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 180,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.04)" },
        horzLines: { color: "rgba(0,0,0,0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        horzLine: { visible: false },
      },
    });

    const equitySeries = chart.addAreaSeries({
      lineColor: isProfit ? "#2d5a3d" : "#c23a3a",
      topColor: isProfit ? "rgba(45, 90, 61, 0.2)" : "rgba(194, 58, 58, 0.2)",
      bottomColor: isProfit ? "rgba(45, 90, 61, 0.02)" : "rgba(194, 58, 58, 0.02)",
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (v: number) => formatUsd(v) },
    });

    const drawdownSeries = chart.addHistogramSeries({
      priceFormat: { type: "custom", formatter: (v: number) => `${v.toFixed(2)}%` },
      priceScaleId: "drawdown",
    });

    chart.priceScale("drawdown").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    equitySeriesRef.current = equitySeries;
    drawdownSeriesRef.current = drawdownSeries;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [isProfit]);

  useEffect(() => {
    if (equitySeriesRef.current && equityData.length > 0) {
      equitySeriesRef.current.setData(equityData);
    }
    if (drawdownSeriesRef.current && drawdownData.length > 0) {
      drawdownSeriesRef.current.setData(drawdownData);
    }
    if (chartRef.current && equityData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [equityData, drawdownData]);

  if (points.length < 2) {
    return (
      <div className={className}>
        <div className="flex h-[180px] items-center justify-center text-[12px] text-ink-500">
          至少需要一笔成交才能生成权益曲线
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Summary row */}
      <div className="mb-2 flex flex-wrap items-center gap-4 px-1 text-[11px]">
        <div>
          <span className="text-ink-500">权益 </span>
          <span className="font-mono font-semibold text-ink-900">{formatUsd(currentEquity)}</span>
        </div>
        <div>
          <span className="text-ink-500">盈亏 </span>
          <span className={`font-mono font-semibold ${isProfit ? "text-profit" : "text-loss"}`}>
            {formatPct(pnlPct)}
          </span>
        </div>
        <div>
          <span className="text-ink-500">最大回撤 </span>
          <span className="font-mono font-semibold text-loss">
            {maxDrawdown > 0 ? `-${maxDrawdown.toFixed(2)}%` : "0%"}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full" />
    </div>
  );
}

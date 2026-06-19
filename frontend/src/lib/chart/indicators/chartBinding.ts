import type {
  IChartApi,
  ISeriesApi,
  HistogramData,
  LineData,
  UTCTimestamp,
} from "lightweight-charts";
import { LineStyle } from "lightweight-charts";
import { buildChartPaneLayout } from "@/lib/chart/indicators/layout";
import {
  computeIndicator,
  getIndicatorDefinition,
  macdHistogramColor,
} from "@/lib/chart/indicators/registry";
import type { IndicatorId, OhlcBar } from "@/lib/chart/indicators/types";

export type IndicatorSeriesHandle = ISeriesApi<"Line" | "Histogram">;

function seriesKey(indicatorId: IndicatorId, partKey: string): string {
  return `${indicatorId}:${partKey}`;
}

function toLineData(points: { time: UTCTimestamp; value: number }[]): LineData[] {
  return points.map((point) => ({ time: point.time, value: point.value }));
}

function applySubScaleMargins(
  api: IndicatorSeriesHandle,
  scaleMargins: { top: number; bottom: number },
): void {
  api.priceScale().applyOptions({
    scaleMargins,
    borderVisible: false,
  });
}

export function syncIndicatorSeriesOnChart(
  chart: IChartApi,
  bound: Map<string, IndicatorSeriesHandle>,
  bars: OhlcBar[],
  selected: IndicatorId[],
  candleSeries: ISeriesApi<"Candlestick">,
  volumeSeries: ISeriesApi<"Histogram">,
): void {
  const layout = buildChartPaneLayout(selected);
  candleSeries.priceScale().applyOptions({
    scaleMargins: { top: layout.candle.top, bottom: layout.candle.bottom },
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: layout.volume.top, bottom: layout.volume.bottom },
  });

  const desiredKeys = new Set<string>();
  for (const id of selected) {
    const def = getIndicatorDefinition(id);
    if (!def) continue;
    const computed = computeIndicator(id, bars);
    for (const part of computed) {
      desiredKeys.add(seriesKey(id, part.key));
    }
  }

  for (const [key, api] of Array.from(bound.entries())) {
    if (!desiredKeys.has(key)) {
      chart.removeSeries(api);
      bound.delete(key);
    }
  }

  const configuredSubScales = new Set<string>();

  for (const id of selected) {
    const def = getIndicatorDefinition(id);
    if (!def) continue;
    const computed = computeIndicator(id, bars);
    const subPane = layout.subPanes.find((pane) => pane.id === id);

    for (const part of computed) {
      const key = seriesKey(id, part.key);
      let api = bound.get(key);

      if (!api) {
        if (def.pane === "overlay") {
          api =
            part.kind === "histogram"
              ? chart.addHistogramSeries({
                  color: part.color,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  priceScaleId: "right",
                })
              : chart.addLineSeries({
                  color: part.color,
                  lineWidth: 1,
                  priceLineVisible: false,
                  lastValueVisible: false,
                  crosshairMarkerVisible: false,
                  priceScaleId: "right",
                  lineStyle: LineStyle.Solid,
                });
        } else if (subPane) {
          const { scaleId, scaleMargins } = subPane;

          if (part.kind === "histogram") {
            api = chart.addHistogramSeries({
              color: part.color,
              priceLineVisible: false,
              lastValueVisible: false,
              priceScaleId: scaleId,
            });
          } else {
            api = chart.addLineSeries({
              color: part.color,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              priceScaleId: scaleId,
            });
          }

          if (api && !configuredSubScales.has(scaleId)) {
            applySubScaleMargins(api, scaleMargins);
            configuredSubScales.add(scaleId);
          }

          if (id === "rsi:14" && part.kind === "line" && api) {
            api.applyOptions({
              autoscaleInfoProvider: () => ({
                priceRange: { minValue: 0, maxValue: 100 },
              }),
            });
          }
        }
        if (api) {
          bound.set(key, api);
        }
      } else if (subPane && !configuredSubScales.has(subPane.scaleId)) {
        applySubScaleMargins(api, subPane.scaleMargins);
        configuredSubScales.add(subPane.scaleId);
      }

      if (!api) continue;

      if (part.kind === "histogram" && id === "macd:12,26,9") {
        const hist: HistogramData[] = part.data.map((point) => ({
          time: point.time,
          value: point.value,
          color: macdHistogramColor(point.value),
        }));
        api.setData(hist);
      } else {
        api.setData(toLineData(part.data));
      }
    }
  }
}

export function clearIndicatorSeries(chart: IChartApi, bound: Map<string, IndicatorSeriesHandle>): void {
  for (const api of Array.from(bound.values())) {
    chart.removeSeries(api);
  }
  bound.clear();
}

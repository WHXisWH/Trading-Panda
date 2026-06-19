import type { IndicatorId } from "@/lib/chart/indicators/types";
import { getIndicatorDefinition } from "@/lib/chart/indicators/registry";

/** lightweight-charts price scale IDs must exist on a series first; keep IDs simple (no `:`). */
export function indicatorPriceScaleId(id: IndicatorId): string {
  return `sub-${id.replace(/[^a-z0-9]+/gi, "-")}`;
}

export type ChartPaneLayout = {
  candle: { top: number; bottom: number };
  volume: { top: number; bottom: number };
  subPanes: Array<{
    id: IndicatorId;
    scaleId: string;
    scaleMargins: { top: number; bottom: number };
  }>;
};

/** Derive scale margins for candle / volume / sub indicators on a single chart. */
export function buildChartPaneLayout(selected: IndicatorId[]): ChartPaneLayout {
  const subIds = selected.filter((id) => getIndicatorDefinition(id)?.pane === "sub");
  const subCount = subIds.length;

  const volumeHeight = 0.14;
  const subBandHeight = 0.14;
  const subTotal = subBandHeight * subCount;
  const candleBottom = 0.1 + volumeHeight + subTotal;

  const subPanes = subIds.map((id, index) => {
    const bandBottom = volumeHeight + subBandHeight * index;
    const bandTop = bandBottom + subBandHeight;
    return {
      id,
      scaleId: indicatorPriceScaleId(id),
      scaleMargins: { top: 1 - bandTop, bottom: bandBottom },
    };
  });

  return {
    candle: { top: 0.06, bottom: candleBottom },
    volume: { top: 1 - volumeHeight, bottom: 0 },
    subPanes,
  };
}

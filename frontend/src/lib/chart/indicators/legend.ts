import { computeIndicator } from "@/lib/chart/indicators/registry";
import type { IndicatorId, IndicatorLegendEntry, OhlcBar } from "@/lib/chart/indicators/types";

export function buildIndicatorLegend(
  bars: OhlcBar[],
  selected: IndicatorId[],
): IndicatorLegendEntry[] {
  const entries: IndicatorLegendEntry[] = [];
  for (const id of selected) {
    const parts = computeIndicator(id, bars);
    for (const part of parts) {
      if (part.data.length === 0) {
        continue;
      }
      entries.push({
        id,
        label: part.label,
        color: part.color,
        value: part.data[part.data.length - 1].value,
      });
    }
  }
  return entries;
}

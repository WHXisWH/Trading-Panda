import type { SeriesMarker, Time } from "lightweight-charts";
import type { TradeRecordApi } from "@/types/trading";

export function tradesToChartMarkers(trades: TradeRecordApi[]): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];
  for (const trade of trades) {
    const ms = Date.parse(trade.created_at);
    if (Number.isNaN(ms)) {
      continue;
    }
    const isBuy = trade.action === "BUY";
    markers.push({
      time: Math.floor(ms / 1000) as Time,
      position: isBuy ? "belowBar" : "aboveBar",
      color: isBuy ? "#2d5a3d" : "#c23a3a",
      shape: isBuy ? "arrowUp" : "arrowDown",
      text: trade.action,
    });
  }
  return markers.sort((a, b) => (a.time as number) - (b.time as number));
}

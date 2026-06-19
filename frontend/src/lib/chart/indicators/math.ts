import type { IndicatorPoint, OhlcBar } from "@/lib/chart/indicators/types";

export function closes(bars: OhlcBar[]): number[] {
  return bars.map((b) => b.close);
}

export function smaValues(values: number[], period: number): IndicatorPoint[] {
  if (values.length < period || period < 1) {
    return [];
  }
  const points: IndicatorPoint[] = [];
  let windowSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    windowSum += values[i];
    if (i >= period) {
      windowSum -= values[i - period];
    }
    if (i >= period - 1) {
      points.push({ time: i as unknown as IndicatorPoint["time"], value: windowSum / period });
    }
  }
  return points;
}

export function smaFromBars(bars: OhlcBar[], period: number): IndicatorPoint[] {
  if (bars.length < period) {
    return [];
  }
  const points: IndicatorPoint[] = [];
  let windowSum = 0;
  for (let i = 0; i < bars.length; i += 1) {
    windowSum += bars[i].close;
    if (i >= period) {
      windowSum -= bars[i - period].close;
    }
    if (i >= period - 1) {
      points.push({ time: bars[i].time, value: windowSum / period });
    }
  }
  return points;
}

export function emaValues(values: number[], period: number): number[] {
  if (values.length === 0 || period < 1) {
    return [];
  }
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function emaFromBars(bars: OhlcBar[], period: number): IndicatorPoint[] {
  const values = closes(bars);
  const ema = emaValues(values, period);
  if (ema.length === 0) {
    return [];
  }
  return ema.map((value, index) => ({ time: bars[index].time, value }));
}

export function rsiFromCloses(values: number[], period = 14): IndicatorPoint[] {
  if (values.length < period + 1) {
    return [];
  }
  const points: IndicatorPoint[] = [];
  for (let i = period; i < values.length; i += 1) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const delta = values[j] - values[j - 1];
      if (delta >= 0) {
        gains += delta;
      } else {
        losses -= delta;
      }
    }
    let rsi: number;
    if (losses === 0) {
      rsi = gains > 0 ? 100 : 50;
    } else {
      const rs = gains / losses;
      rsi = 100 - 100 / (1 + rs);
    }
    points.push({ time: i as unknown as IndicatorPoint["time"], value: rsi });
  }
  return points;
}

export function rsiFromBars(bars: OhlcBar[], period = 14): IndicatorPoint[] {
  const raw = rsiFromCloses(closes(bars), period);
  const offset = bars.length - raw.length;
  return raw.map((point, index) => ({
    time: bars[offset + index].time,
    value: point.value,
  }));
}

export function macdFromCloses(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
} {
  if (values.length < slowPeriod + signalPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }
  const emaFast = emaValues(values, fastPeriod);
  const emaSlow = emaValues(values, slowPeriod);
  const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
  const signalLine = emaValues(macdLine, signalPeriod);
  const start = slowPeriod + signalPeriod - 2;
  const macd: IndicatorPoint[] = [];
  const signal: IndicatorPoint[] = [];
  const histogram: IndicatorPoint[] = [];
  for (let i = start; i < values.length; i += 1) {
    const macdVal = macdLine[i];
    const signalVal = signalLine[i];
    macd.push({ time: i as unknown as IndicatorPoint["time"], value: macdVal });
    signal.push({ time: i as unknown as IndicatorPoint["time"], value: signalVal });
    histogram.push({
      time: i as unknown as IndicatorPoint["time"],
      value: macdVal - signalVal,
    });
  }
  return { macd, signal, histogram };
}

export function macdFromBars(
  bars: OhlcBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
} {
  const raw = macdFromCloses(closes(bars), fastPeriod, slowPeriod, signalPeriod);
  const attachTime = (points: IndicatorPoint[]) => {
    const offset = bars.length - points.length;
    return points.map((point, index) => ({
      time: bars[offset + index].time,
      value: point.value,
    }));
  };
  return {
    macd: attachTime(raw.macd),
    signal: attachTime(raw.signal),
    histogram: attachTime(raw.histogram),
  };
}

export function bollingerFromBars(
  bars: OhlcBar[],
  period = 20,
  stdDev = 2,
): { upper: IndicatorPoint[]; middle: IndicatorPoint[]; lower: IndicatorPoint[] } {
  if (bars.length < period) {
    return { upper: [], middle: [], lower: [] };
  }
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];
  for (let i = period - 1; i < bars.length; i += 1) {
    const window = bars.slice(i - period + 1, i + 1).map((b) => b.close);
    const mean = window.reduce((sum, v) => sum + v, 0) / period;
    const variance =
      window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const time = bars[i].time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + stdDev * std });
    lower.push({ time, value: mean - stdDev * std });
  }
  return { upper, middle, lower };
}

import {
  DEFAULT_INDICATOR_IDS,
  isIndicatorId,
  sanitizeIndicatorSelection,
} from "@/lib/chart/indicators/registry";
import type { IndicatorId } from "@/lib/chart/indicators/types";

const STORAGE_KEY = "chart-indicators:v1";

export function loadSelectedIndicators(maxSub: number): IndicatorId[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_INDICATOR_IDS];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_INDICATOR_IDS];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_INDICATOR_IDS];
    }
    const ids = parsed.filter((item): item is IndicatorId => typeof item === "string" && isIndicatorId(item));
    return sanitizeIndicatorSelection(ids, maxSub);
  } catch {
    return [...DEFAULT_INDICATOR_IDS];
  }
}

export function saveSelectedIndicators(ids: IndicatorId[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}

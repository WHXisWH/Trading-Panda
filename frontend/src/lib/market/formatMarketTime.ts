const FALLBACK_TIME_ZONE = "UTC";

/** Browser/OS timezone from Intl (updates when user travels if OS adjusts). */
export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

let cachedTimeZone: string | null = null;
let resolvePromise: Promise<string> | null = null;

/**
 * Resolve display timezone: edge header (CF / Vercel IP geo) when deployed,
 * otherwise browser Intl.
 */
export async function resolveUserTimeZone(): Promise<string> {
  if (cachedTimeZone) {
    return cachedTimeZone;
  }
  if (resolvePromise) {
    return resolvePromise;
  }
  resolvePromise = (async () => {
    const browserTz = detectBrowserTimeZone();
    try {
      const res = await fetch("/api/geo/timezone", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { timeZone?: string | null };
        if (data.timeZone) {
          cachedTimeZone = data.timeZone;
          return cachedTimeZone;
        }
      }
    } catch {
      /* fall back to browser */
    }
    cachedTimeZone = browserTz;
    return cachedTimeZone;
  })();
  return resolvePromise;
}

export function getCachedUserTimeZone(): string {
  return cachedTimeZone ?? detectBrowserTimeZone();
}

export function normalizeUnixSeconds(raw: number): number {
  return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
}

export function formatMarketDateTime(
  raw: number | string | undefined | null,
  timeZone?: string,
): string {
  if (raw == null) {
    return "—";
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return String(raw);
  }
  const tz = timeZone ?? getCachedUserTimeZone();
  const ms = normalizeUnixSeconds(n) * 1000;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

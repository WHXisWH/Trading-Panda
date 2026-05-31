/** Panda appearance lab — feature flag & URL helpers */

export function isPandaLabEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ENABLE_PANDA_LAB === "true";
}

const LAB_QUERY_KEYS = [
  "b",
  "p",
  "i",
  "f",
  "c",
  "co",
  "e",
  "x",
] as const;

export function pandaStatsToSearchParams(stats: {
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  emotion: string;
  experience: number;
}): string {
  const p = new URLSearchParams({
    b: String(stats.boldness),
    p: String(stats.patience),
    i: String(stats.intuition),
    f: String(stats.focus),
    co: String(stats.contrarian),
    e: stats.emotion,
    x: String(stats.experience),
  });
  return p.toString();
}

export function parsePandaStatsFromSearch(
  params: URLSearchParams
): Partial<{
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  emotion: string;
  experience: number;
}> {
  const num = (key: string) => {
    const v = params.get(key);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : undefined;
  };
  const emotion = params.get("e") ?? undefined;
  return {
    boldness: num("b"),
    patience: num("p"),
    intuition: num("i"),
    focus: num("f"),
    contrarian: num("co"),
    emotion,
    experience: num("x"),
  };
}

export { LAB_QUERY_KEYS };

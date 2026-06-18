/** Canonical pair label: BASE-QUOTE (matches market-monitor `pair` field). */
export function canonicalMarketPair(value: string): string {
  return value.trim().replace(/_/g, "-").replace(/\//g, "-");
}

export function dedupeMarketPairs(pairs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const pair of pairs) {
    const normalized = canonicalMarketPair(pair);
    if (!normalized) continue;
    const key = normalized.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function sameMarketPair(a: string, b: string): boolean {
  return canonicalMarketPair(a).toUpperCase() === canonicalMarketPair(b).toUpperCase();
}

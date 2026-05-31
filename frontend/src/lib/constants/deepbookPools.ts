/** MVP DeepBook Testnet pools — aligned with market-monitor DEEPBOOK_POOLS */

export const DEEPBOOK_MVP_POOLS = ["DEEP/SUI", "SUI/DBUSDC"] as const;

export type DeepbookPool = (typeof DEEPBOOK_MVP_POOLS)[number];

export const DEFAULT_DEEPBOOK_POOL: DeepbookPool = "DEEP/SUI";

export function isDeepbookPool(value: string): value is DeepbookPool {
  return (DEEPBOOK_MVP_POOLS as readonly string[]).includes(value);
}

/** Subscribed list from API; fallback to default when empty. */
export function resolveSubscribedPools(raw: readonly string[] | undefined): DeepbookPool[] {
  const subs = (raw ?? []).filter(isDeepbookPool);
  return subs.length > 0 ? [...subs] : [DEFAULT_DEEPBOOK_POOL];
}

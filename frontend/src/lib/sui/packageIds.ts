/**
 * Sui package IDs after upgrade:
 * - original-id (v1 publish): mint + legacy modules only
 * - published-at (latest upgrade): agent_wallet, trading_policy, panda_vault, …
 */

function readPackageOriginalId(): string {
  return process.env.NEXT_PUBLIC_PACKAGE_ID ?? "";
}

function readPackagePublishedAt(): string {
  const published = process.env.NEXT_PUBLIC_PACKAGE_PUBLISHED_AT ?? "";
  return published || readPackageOriginalId();
}

/** Latest on-chain package object — use for all PTB moveCall targets. */
export function packageIdForMoveCall(): string {
  return readPackagePublishedAt();
}

/** Match events emitted by any upgrade generation of this package lineage. */
export function packageIdsForEventMatch(): string[] {
  const ids = [readPackageOriginalId(), readPackagePublishedAt()]
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export function eventTypeMatchesPackage(eventType: string): boolean {
  const ids = packageIdsForEventMatch();
  if (!ids.length) return true;
  const normalized = eventType.toLowerCase();
  return ids.some((id) => normalized.includes(id));
}

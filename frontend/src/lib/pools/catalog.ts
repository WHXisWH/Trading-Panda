import type { PoolCatalogItem } from "@/types/pools";

/** Static DeepBook MVP catalog — ids match monitor `pair` / DEEPBOOK_POOLS */
export const DEEPBOOK_POOL_CATALOG: PoolCatalogItem[] = [
  {
    id: "DEEP/SUI",
    name: "DEEP/SUI",
    description: "DeepBook Testnet 现货订单簿",
    recommended: true,
  },
  {
    id: "SUI/DBUSDC",
    name: "SUI/DBUSDC",
    description: "DeepBook Testnet · SUI / DBUSDC",
    recommended: false,
  },
];

export const POOLS_STORAGE_KEY = "trading-panda-selected-pools";
export const POOLS_PRIMARY_KEY = "trading-panda-primary-pool";

/** Align with backend `max_pools_for_focus` (capped at 2 MVP pools). */
export function maxPoolsFromFocus(focus: number): number {
  return Math.min(2, Math.max(1, 1 + Math.floor(focus / 25)));
}

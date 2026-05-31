import type { DeepbookPool } from "@/lib/constants/deepbookPools";

export interface PoolCatalogItem {
  id: DeepbookPool;
  name: string;
  description: string;
  recommended?: boolean;
  /** Enriched on client from monitor health / candles */
  liquidity?: string;
  volume24h?: string;
  price?: string;
  change24h?: number;
  status?: "online" | "degraded" | "offline";
  healthError?: string | null;
}

export interface PandaPoolsData {
  subscribed_pools: DeepbookPool[];
  primary_pool: DeepbookPool;
  max_pools: number;
  available_pools: PoolCatalogItem[];
}

export interface MarketPoolsHealth {
  status?: string;
  pools?: Record<
    string,
    {
      pool?: string;
      last_publish_ts?: number | null;
      error?: string | null;
    }
  >;
}

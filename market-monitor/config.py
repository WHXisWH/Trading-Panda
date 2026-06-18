from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    deepbook_server_url: str = "https://deepbook-indexer.mainnet.mystenlabs.com"
    deepbook_database_url: str = ""
    deepbook_pools: str = ""
    deepbook_network: str = "mainnet"
    redis_url: str = ""
    price_scale: float = 1e9
    qty_scale: float = 1e9
    use_ohlcv_fallback: bool = False
    # When true, prefer HTTP /get_pools from DeepBook indexer before Sui RPC.
    use_http_pool_discovery_primary: bool = True

    sui_rpc_url: str = "https://fullnode.mainnet.sui.io:443"
    deepbook_package_id: str = (
        "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809"
    )
    deepbook_pool_module: str = "pool"
    use_sui_rpc_for_pools: bool = True
    use_http_get_pools_fallback: bool = True
    pool_rpc_limit_per_page: int = 50
    pool_rpc_max_pages: int = 20
    use_pair_ranking: bool = True
    max_publish_pairs: int = 4
    launch_pairs: str = "SUI_USDC,DEEP_USDC,WAL_USDC,NS_USDC"
    stale_threshold_sec: float = 120.0

    poll_interval_sec: float = 15.0
    candle_period: str = "1m"  # env: CANDLE_PERIOD
    ohlcv_limit: int = 60  # env: OHLCV_LIMIT
    # PG order_fills lookback (seconds). Poll: recent window for ticks; REST: chart history.
    fills_poll_lookback_sec: int = 259_200  # 72h — env: FILLS_POLL_LOOKBACK_SEC
    fills_lookback_sec: int = 2_592_000  # 30d — env: FILLS_LOOKBACK_SEC (PG tick poll)
    candles_history_max_sec: int = 365 * 86400  # 1y soft cap — env: CANDLES_HISTORY_MAX_SEC
    orderbook_depth: int = 10
    orderbook_level: int = 2
    publish_heartbeat_sec: float = 30.0

    port: int = 8001

    @property
    def pool_list(self) -> list[str] | None:
        if not self.deepbook_pools.strip():
            return None
        from feed.sui_pool_client import normalize_pool_list

        raw = [p.strip() for p in self.deepbook_pools.split(",") if p.strip()]
        return normalize_pool_list(raw) or None

    @property
    def launch_pair_list(self) -> list[str]:
        from feed.sui_pool_client import normalize_pool_list

        raw = [p.strip() for p in self.launch_pairs.split(",") if p.strip()]
        return normalize_pool_list(raw)


@lru_cache
def get_settings() -> Settings:
    return Settings()

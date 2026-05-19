from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    deepbook_server_url: str = "http://localhost:9008"
    deepbook_pools: str = ""
    redis_url: str = ""

    poll_interval_sec: float = 2.0
    candle_period: str = "1m"  # env: CANDLE_PERIOD
    ohlcv_limit: int = 60  # env: OHLCV_LIMIT
    publish_heartbeat_sec: float = 30.0

    port: int = 8001

    @property
    def pool_list(self) -> list[str] | None:
        if not self.deepbook_pools.strip():
            return None
        return [p.strip() for p in self.deepbook_pools.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

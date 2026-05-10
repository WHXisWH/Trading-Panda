"""Application configuration — loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    database_url: str = ""

    # Redis (optional for basic testing)
    redis_url: str = ""

    # LLM (optional — parse returns mock if unset)
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    agent_timeout_seconds: int = 3

    # Sui
    sui_rpc_url: str = "https://fullnode.testnet.sui.io:443"
    sui_private_key: str = ""
    sui_wallet_address: str = ""
    package_id: str = ""
    registry_id: str = ""
    achievement_registry_id: str = ""
    transfer_policy_id: str = ""

    # Walrus
    walrus_publisher_url: str = ""
    walrus_aggregator_url: str = ""

    # Auth
    jwt_secret: str = "dev-jwt-secret-change-in-production-32bytes-xxxx"
    internal_secret: str = "dev-internal-secret-change-in-production"

    # Runtime
    port: int = 8000
    max_actors: int = 100
    merkle_batch_size: int = 50
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]

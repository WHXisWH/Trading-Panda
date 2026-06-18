"""Application configuration — loaded from environment variables."""
from pathlib import Path

from pydantic_settings import BaseSettings
from typing import List

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILE = _BACKEND_ROOT / ".env"


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
    admin_cap_id: str = ""
    package_id: str = ""
    package_published_at: str = ""
    registry_id: str = ""
    achievement_registry_id: str = ""
    transfer_policy_id: str = ""
    agent_signer_address: str = ""
    agent_signer_private_key: str = ""
    chain_proof_enabled: bool = False
    chain_proof_auto_score_threshold: float = 0.75
    chain_proof_cooldown_minutes: int = 30
    chain_proof_daily_cap: int = 10
    deepbook_launch_pairs: str = "DEEP-SUI,SUI-USDC"
    market_monitor_url: str = "http://localhost:8001"

    # Walrus
    walrus_publisher_url: str = ""
    walrus_aggregator_url: str = ""

    # Auth
    jwt_secret: str = "dev-jwt-secret-change-in-production-32bytes-xxxx"
    internal_secret: str = "dev-internal-secret-change-in-production"
    google_client_id: str = ""  # optional; validates zkLogin id_token aud
    auth_nonce_ttl_seconds: int = 300

    # Runtime
    port: int = 8000
    max_actors: int = 100
    merkle_batch_size: int = 50
    merkle_submit_enabled: bool = True
    skill_digest_enabled: bool = True
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:3000"]

    model_config = {
        "env_file": str(_ENV_FILE),
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()  # type: ignore[call-arg]

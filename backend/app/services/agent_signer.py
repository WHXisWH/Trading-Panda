"""Testnet Agent Signer — Mode 2 PandaCoin demo PTBs only (Epic 6)."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Any, Callable, Awaitable

from app.config import settings
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.wallet_verify import normalize_sui_address

logger = logging.getLogger(__name__)

SubmitFn = Callable[["DemoTradeParams"], Awaitable["SubmitResult"]]


@dataclass(frozen=True)
class DemoTradeParams:
    vault_object_id: str
    policy_object_id: str
    pair: str
    side: str
    notional: int
    reference_price: int
    decision_hash: bytes
    proof_key: str
    proof_source: int
    policy_version: int
    trade_fact_id_hash: bytes = b""
    current_daily_loss: int = 0


@dataclass(frozen=True)
class SubmitResult:
    tx_digest: str
    dry_run: bool = False
    event_payload: dict[str, Any] | None = None
    error_message: str | None = None


class AgentSignerService:
    """Signs only authorized testnet demo_executor PTBs."""

    def __init__(self, submit_fn: SubmitFn | None = None) -> None:
        self._submit_fn = submit_fn

    def validate_preconditions(
        self,
        *,
        policy_authorized_agent: str | None,
        vault_authorized_agent: str | None,
        policy_version: int,
        expected_policy_version: int,
        policy_paused: bool,
        vault_status: str,
        mode: str = "training_ledger",
    ) -> None:
        if not settings.chain_proof_enabled:
            raise ApiError(ApiErrorCode.CHAIN_PROOF_DISABLED, "Chain Proof is disabled")

        signer = (settings.agent_signer_address or "").strip()
        if not signer:
            raise ApiError(
                ApiErrorCode.AGENT_SIGNER_NOT_CONFIGURED,
                "Agent Signer is not configured on this server",
            )

        if policy_paused or vault_status != "active":
            raise ApiError(ApiErrorCode.POLICY_PAUSED, "TradingPolicy or vault is not active")

        if policy_version != expected_policy_version:
            raise ApiError(
                ApiErrorCode.POLICY_VERSION_STALE,
                f"Policy version mismatch: expected {expected_policy_version}, got {policy_version}",
            )

        chain_agent = policy_authorized_agent or vault_authorized_agent
        if not chain_agent:
            raise ApiError(ApiErrorCode.AGENT_SIGNER_UNAUTHORIZED, "Authorized agent was revoked")

        if normalize_sui_address(chain_agent) != normalize_sui_address(signer):
            raise ApiError(
                ApiErrorCode.AGENT_SIGNER_UNAUTHORIZED,
                "Environment Agent Signer does not match TradingPolicy authorized agent",
            )

        if mode not in ("training_ledger", "panda_coin_demo"):
            raise ApiError(
                ApiErrorCode.AGENT_SIGNER_NETWORK_NOT_ALLOWED,
                "Agent Signer only supports testnet demo modes",
            )

    async def submit_demo_trade(self, params: DemoTradeParams) -> SubmitResult:
        if self._submit_fn is not None:
            return await self._submit_fn(params)

        private_key = (settings.agent_signer_private_key or "").strip()
        if not private_key:
            return self._dry_run_result(params)

        try:
            return await self._submit_with_pysui(params, private_key)
        except ImportError:
            logger.warning("pysui not installed — falling back to dry-run Chain Proof")
            return self._dry_run_result(params)
        except Exception as exc:
            raise ApiError(
                ApiErrorCode.CHAIN_PROOF_TX_FAILED,
                "Testnet PTB submission failed",
                details={"reason": str(exc)},
            ) from exc

    def _dry_run_result(self, params: DemoTradeParams) -> SubmitResult:
        digest_seed = hashlib.sha256(
            f"{params.proof_key}:{params.vault_object_id}:{params.policy_object_id}".encode()
        ).hexdigest()
        digest = f"DRYRUN_{digest_seed[:52]}"
        return SubmitResult(
            tx_digest=digest,
            dry_run=True,
            event_payload={
                "type": "DemoTradeExecuted",
                "vault_id": params.vault_object_id,
                "policy_id": params.policy_object_id,
                "pair": params.pair,
                "side": params.side,
                "notional": params.notional,
                "decision_hash": params.decision_hash.hex(),
                "proof_key": params.proof_key,
                "policy_version": params.policy_version,
                "dry_run": True,
            },
        )

    async def _submit_with_pysui(self, params: DemoTradeParams, private_key: str) -> SubmitResult:
        from pysui import SuiConfig, SyncClient  # type: ignore[import-untyped]
        from pysui.sui.sui_txn import SyncTransaction  # type: ignore[import-untyped]

        package_id = settings.package_id
        if not package_id:
            raise ApiError(ApiErrorCode.AGENT_SIGNER_NOT_CONFIGURED, "PACKAGE_ID is not configured")

        cfg = SuiConfig.user_config(
            rpc_url=settings.sui_rpc_url,
            prv_keys=[private_key],
        )
        client = SyncClient(cfg)
        tx = SyncTransaction(client=client)

        side_code = 1 if params.side.upper() == "BUY" else 2
        pair_hash = list(params.pair.encode("utf-8"))
        decision_hash = list(params.decision_hash)
        proof_key_hash = list(bytes.fromhex(params.proof_key))
        trade_fact_id_hash = list(params.trade_fact_id_hash or params.proof_key[:16].encode())

        tx.move_call(
            target=f"{package_id}::demo_executor::execute_demo_trade",
            arguments=[
                params.vault_object_id,
                params.policy_object_id,
                pair_hash,
                side_code,
                params.notional,
                params.reference_price,
                decision_hash,
                proof_key_hash,
                trade_fact_id_hash,
                params.proof_source,
                params.policy_version,
                params.current_daily_loss,
                "0x6",
            ],
        )
        result = tx.execute(gas_budget="10000000")
        if not result.is_ok():
            raise RuntimeError(str(result.result_string))

        digest = str(result.digest)
        return SubmitResult(
            tx_digest=digest,
            dry_run=False,
            event_payload={
                "type": "DemoTradeExecuted",
                "vault_id": params.vault_object_id,
                "policy_id": params.policy_object_id,
                "pair": params.pair,
                "side": params.side,
                "notional": params.notional,
                "policy_version": params.policy_version,
                "proof_key": params.proof_key,
            },
        )


def side_to_u8(side: str) -> int:
    return 1 if side.upper() == "BUY" else 2


def proof_source_to_u8(source: str) -> int:
    return 2 if source == "manual" else 1

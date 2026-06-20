"""On-chain trust proof submission — Merkle roots and skill digests (Epic 9)."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Any, Callable, Awaitable

from app.config import settings
from app.services.package_ids import package_id_for_move_call
from app.services.pysui_compat import pysui_object_id, tx_digest_from_result, tx_failure_reason

logger = logging.getLogger(__name__)

SubmitMerkleFn = Callable[["MerkleSubmitParams"], Awaitable["TrustSubmitResult"]]
SubmitSkillFn = Callable[["SkillDigestParams"], Awaitable["TrustSubmitResult"]]


@dataclass(frozen=True)
class MerkleSubmitParams:
    panda_object_id: str
    root_hash: str
    trade_count: int
    start_trade_id: int
    end_trade_id: int
    batch_index: int


@dataclass(frozen=True)
class SkillDigestParams:
    panda_object_id: str
    skill_version: int
    skill_hash: str


@dataclass(frozen=True)
class TrustSubmitResult:
    tx_digest: str
    dry_run: bool = False


class TrustProofService:
    """Submits Merkle roots and skill digests via AdminCap-signed PTBs."""

    def __init__(
        self,
        merkle_submit_fn: SubmitMerkleFn | None = None,
        skill_submit_fn: SubmitSkillFn | None = None,
    ) -> None:
        self._merkle_submit_fn = merkle_submit_fn
        self._skill_submit_fn = skill_submit_fn

    async def submit_merkle_root(self, params: MerkleSubmitParams) -> TrustSubmitResult:
        if self._merkle_submit_fn is not None:
            return await self._merkle_submit_fn(params)

        private_key = (settings.sui_private_key or "").strip()
        admin_cap_id = (settings.admin_cap_id or "").strip()
        if not _usable_private_key(private_key) or not admin_cap_id or not package_id_for_move_call():
            return self._dry_run_merkle(params)

        try:
            return await self._submit_merkle_with_pysui(params, private_key, admin_cap_id)
        except ImportError:
            logger.warning("pysui not installed — Merkle submit dry-run")
            return self._dry_run_merkle(params)
        except Exception as exc:
            logger.exception("Merkle root submit failed")
            raise RuntimeError(f"Merkle root submit failed: {exc}") from exc

    async def submit_skill_digest(self, params: SkillDigestParams) -> TrustSubmitResult:
        if self._skill_submit_fn is not None:
            return await self._skill_submit_fn(params)

        private_key = (settings.sui_private_key or "").strip()
        admin_cap_id = (settings.admin_cap_id or "").strip()
        if not _usable_private_key(private_key) or not admin_cap_id or not package_id_for_move_call():
            return self._dry_run_skill(params)

        try:
            return await self._submit_skill_with_pysui(params, private_key, admin_cap_id)
        except ImportError:
            logger.warning("pysui not installed — skill digest dry-run")
            return self._dry_run_skill(params)
        except Exception as exc:
            logger.exception("Skill digest submit failed")
            raise RuntimeError(f"Skill digest submit failed: {exc}") from exc

    def _dry_run_merkle(self, params: MerkleSubmitParams) -> TrustSubmitResult:
        seed = hashlib.sha256(
            f"merkle:{params.panda_object_id}:{params.batch_index}:{params.root_hash}".encode()
        ).hexdigest()
        return TrustSubmitResult(tx_digest=f"DRYRUN_MERKLE_{seed[:44]}", dry_run=True)

    def _dry_run_skill(self, params: SkillDigestParams) -> TrustSubmitResult:
        seed = hashlib.sha256(
            f"skill:{params.panda_object_id}:{params.skill_version}:{params.skill_hash}".encode()
        ).hexdigest()
        return TrustSubmitResult(tx_digest=f"DRYRUN_SKILL_{seed[:44]}", dry_run=True)

    async def _submit_merkle_with_pysui(
        self,
        params: MerkleSubmitParams,
        private_key: str,
        admin_cap_id: str,
    ) -> TrustSubmitResult:
        from pysui import SuiConfig, SyncClient  # type: ignore[import-untyped]
        from pysui.sui.sui_types.scalars import SuiU64  # type: ignore[import-untyped]
        from pysui.sui.sui_txn import SyncTransaction  # type: ignore[import-untyped]

        root_bytes = bytes.fromhex(params.root_hash)
        if len(root_bytes) != 32:
            raise ValueError("Merkle root must be 32 bytes")

        cfg = SuiConfig.user_config(rpc_url=settings.sui_rpc_url, prv_keys=[private_key])
        client = SyncClient(cfg)
        tx = SyncTransaction(client=client)
        package_id = package_id_for_move_call()
        tx.move_call(
            target=f"{package_id}::trust_proof::submit_merkle_root",
            arguments=[
                pysui_object_id(params.panda_object_id),
                pysui_object_id(admin_cap_id),
                list(root_bytes),
                SuiU64(params.trade_count),
                SuiU64(params.start_trade_id),
                SuiU64(params.end_trade_id),
                pysui_object_id("0x6"),
            ],
        )
        result = tx.execute(gas_budget="10000000")
        if not result.is_ok():
            raise RuntimeError(str(result.result_string))
        if failure_reason := tx_failure_reason(result):
            raise RuntimeError(failure_reason)
        return TrustSubmitResult(tx_digest=tx_digest_from_result(result), dry_run=False)

    async def _submit_skill_with_pysui(
        self,
        params: SkillDigestParams,
        private_key: str,
        admin_cap_id: str,
    ) -> TrustSubmitResult:
        from pysui import SuiConfig, SyncClient  # type: ignore[import-untyped]
        from pysui.sui.sui_types.scalars import SuiU64  # type: ignore[import-untyped]
        from pysui.sui.sui_txn import SyncTransaction  # type: ignore[import-untyped]

        digest_bytes = _skill_hash_bytes(params.skill_hash)

        cfg = SuiConfig.user_config(rpc_url=settings.sui_rpc_url, prv_keys=[private_key])
        client = SyncClient(cfg)
        tx = SyncTransaction(client=client)
        package_id = package_id_for_move_call()
        tx.move_call(
            target=f"{package_id}::trust_proof::submit_skill_digest",
            arguments=[
                pysui_object_id(params.panda_object_id),
                pysui_object_id(admin_cap_id),
                SuiU64(params.skill_version),
                list(digest_bytes),
                pysui_object_id("0x6"),
            ],
        )
        result = tx.execute(gas_budget="10000000")
        if not result.is_ok():
            raise RuntimeError(str(result.result_string))
        if failure_reason := tx_failure_reason(result):
            raise RuntimeError(failure_reason)
        return TrustSubmitResult(tx_digest=tx_digest_from_result(result), dry_run=False)


def _skill_hash_bytes(skill_hash: str) -> bytes:
    normalized = skill_hash.lower().strip()
    if len(normalized) == 64 and all(c in "0123456789abcdef" for c in normalized):
        return bytes.fromhex(normalized)
    return hashlib.sha256(skill_hash.encode()).digest()


def _usable_private_key(private_key: str) -> bool:
    normalized = private_key.strip()
    return bool(normalized and normalized != "base64-encoded-private-key")

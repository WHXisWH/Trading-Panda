"""ChainExecutionWorker — Mode 2 testnet PTB jobs (Epic 6)."""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChainExecutionLog, OrderIntent, PandaVault, TradeFact, TradingPolicy
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_signer import (
    AgentSignerService,
    ChainProofParams,
    CHAIN_PROOF_EVENT_TYPE,
    proof_source_to_u8,
)
from app.services.chain_proof_service import attach_execution_result
from app.services.proof_selector import load_proof_context

logger = logging.getLogger(__name__)


def decision_hash_bytes(decision_hash: str) -> bytes:
    if len(decision_hash) == 64 and all(c in "0123456789abcdef" for c in decision_hash.lower()):
        return bytes.fromhex(decision_hash)
    return hashlib.sha256(decision_hash.encode()).digest()


async def process_chain_proof_job(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    signer: AgentSignerService | None = None,
) -> dict[str, Any]:
    panda_id = payload["panda_id"]
    trade_fact_id = payload["trade_fact_id"]
    proof_key = payload["proof_key"]
    proof_source = payload.get("proof_source", "manual")

    fact, intent, policy_row = await load_proof_context(session, panda_id, trade_fact_id)
    if policy_row is None:
        raise ApiError(ApiErrorCode.POLICY_NOT_FOUND, "TradingPolicy mirror missing")

    vault_row = await session.get(PandaVault, policy_row.vault_id) if policy_row.vault_id else None
    if vault_row is None or not vault_row.sui_object_id or not policy_row.sui_object_id:
        raise ApiError(ApiErrorCode.VAULT_SYNC_PENDING, "Chain objects not mirrored for proof")

    signer_service = signer or AgentSignerService()
    signer_service.validate_preconditions(
        policy_authorized_agent=policy_row.authorized_agent,
        vault_authorized_agent=vault_row.authorized_agent,
        policy_version=intent.policy_version,
        expected_policy_version=policy_row.version,
        policy_paused=bool(policy_row.paused),
        vault_status=vault_row.status,
        mode=vault_row.mode,
    )

    params = ChainProofParams(
        vault_object_id=vault_row.sui_object_id,
        policy_object_id=policy_row.sui_object_id,
        pair=fact.pair,
        side=fact.side,
        notional=max(1, int(float(intent.notional or 1))),
        reference_price=max(1, int(float(intent.reference_price or 1))),
        decision_hash=decision_hash_bytes(intent.decision_hash),
        proof_key=proof_key,
        proof_source=proof_source_to_u8(proof_source),
        policy_version=intent.policy_version,
    )

    try:
        submit_result = await signer_service.submit_chain_proof(params)
    except ApiError as exc:
        await _record_failure(
            session,
            panda_id=panda_id,
            trade_fact_id=trade_fact_id,
            intent=intent,
            fact=fact,
            proof_key=proof_key,
            proof_source=proof_source,
            policy_version=intent.policy_version,
            decision_hash=intent.decision_hash,
            manual_requested_by=payload.get("manual_requested_by"),
            error_message=exc.message,
            retryable=exc.code in {
                ApiErrorCode.CHAIN_PROOF_TX_FAILED,
                ApiErrorCode.SERVICE_UNAVAILABLE,
            },
        )
        raise

    log = await attach_execution_result(
        session,
        panda_id=panda_id,
        trade_fact_id=trade_fact_id,
        order_intent_id=intent.id,
        proof_key=proof_key,
        proof_source=proof_source,
        policy_version=intent.policy_version,
        decision_hash=intent.decision_hash,
        manual_requested_by=payload.get("manual_requested_by"),
        submit_result=submit_result,
        vault=vault_row,
        policy=policy_row,
        intent=intent,
        fact=fact,
    )

    return {
        "trade_fact_id": trade_fact_id,
        "chain_execution_log_id": log.id,
        "tx_digest": log.tx_digest,
        "dry_run": submit_result.dry_run,
        "proof_status": fact.proof_status,
    }


async def _record_failure(
    session: AsyncSession,
    *,
    panda_id: str,
    trade_fact_id: str,
    intent: OrderIntent,
    fact: TradeFact,
    proof_key: str,
    proof_source: str,
    policy_version: int,
    decision_hash: str,
    manual_requested_by: str | None,
    error_message: str,
    retryable: bool,
) -> ChainExecutionLog:
    log = ChainExecutionLog(
        panda_id=panda_id,
        order_intent_id=intent.id,
        trade_fact_id=trade_fact_id,
        tx_digest=f"failed:{proof_key[:48]}",
        policy_version=policy_version,
        decision_hash=decision_hash,
        proof_key=proof_key,
        proof_source=proof_source,
        manual_requested_by=manual_requested_by,
        status="failed",
        error_message=error_message,
        retryable=retryable,
    )
    session.add(log)
    fact.proof_status = "failed"
    fact.chain_execution_log_id = log.id
    await session.flush()
    return log

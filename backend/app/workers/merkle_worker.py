"""MerkleWorker — async Trade Fact batch roots + optional chain submit (Epic 9)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import MerkleRoot, Panda
from app.engine.merkle_worker import persist_merkle_batch
from app.services.async_job_queue import enqueue_job
from app.services.merkle_service import (
    batch_trade_id_range,
    load_batch_facts,
    merkle_root_to_dict,
)
from app.services.trust_proof_service import MerkleSubmitParams, TrustProofService

logger = logging.getLogger(__name__)


async def enqueue_merkle_batch_job(
    session: AsyncSession,
    *,
    panda_id: str,
    batch_index: int,
    trade_count: int,
) -> None:
    await enqueue_job(
        session,
        job_type="merkle_batch_ready",
        idempotency_key=f"merkle:{panda_id}:{batch_index}",
        payload={
            "panda_id": panda_id,
            "batch_index": batch_index,
            "trade_count": trade_count,
        },
        priority=120,
    )


async def process_merkle_batch_job(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    trust_service: TrustProofService | None = None,
) -> dict[str, Any]:
    panda_id = payload["panda_id"]
    batch_index = int(payload["batch_index"])

    existing = await session.execute(
        select(MerkleRoot).where(
            MerkleRoot.panda_id == panda_id,
            MerkleRoot.batch_index == batch_index,
        )
    )
    row = existing.scalar_one_or_none()
    if row is not None:
        if row.sui_tx_digest:
            return {"status": "already_submitted", "merkle": merkle_root_to_dict(row)}
        facts = await load_batch_facts(session, panda_id, batch_index)
        return await _submit_existing_row(session, row, facts, trust_service)

    facts = await load_batch_facts(session, panda_id, batch_index)
    if not facts:
        return {"status": "skipped", "reason": "no_trade_facts"}

    start_fact_id = str(facts[0]["id"])
    end_fact_id = str(facts[-1]["id"])
    root = await persist_merkle_batch(
        session,
        panda_id=panda_id,
        batch_index=batch_index,
        facts=facts,
        start_fact_id=start_fact_id,
        end_fact_id=end_fact_id,
    )
    await session.flush()

    merkle_row = (
        await session.execute(
            select(MerkleRoot).where(
                MerkleRoot.panda_id == panda_id,
                MerkleRoot.batch_index == batch_index,
            )
        )
    ).scalar_one()
    submit_result = await _submit_row_to_chain(
        session,
        merkle_row,
        facts,
        trust_service=trust_service,
    )
    return {
        "status": "committed",
        "root_hash": root,
        "trade_count": len(facts),
        "batch_index": batch_index,
        **submit_result,
    }


async def _submit_existing_row(
    session: AsyncSession,
    row: MerkleRoot,
    facts: list[dict[str, Any]],
    trust_service: TrustProofService | None,
) -> dict[str, Any]:
    submit_result = await _submit_row_to_chain(session, row, facts, trust_service=trust_service)
    return {"status": "resubmitted", "merkle": merkle_root_to_dict(row), **submit_result}


async def _submit_row_to_chain(
    session: AsyncSession,
    row: MerkleRoot,
    facts: list[dict[str, Any]],
    *,
    trust_service: TrustProofService | None,
) -> dict[str, Any]:
    if row.sui_tx_digest:
        return {"chain_status": "submitted", "tx_digest": row.sui_tx_digest}

    if not settings.merkle_submit_enabled:
        return {"chain_status": "pending", "reason": "merkle_submit_disabled"}

    panda = await session.get(Panda, row.panda_id)
    if panda is None or not panda.sui_object_id:
        return {"chain_status": "pending", "reason": "panda_object_missing"}

    trade_count = len(facts) or int(row.trade_count)
    start_id, end_id = batch_trade_id_range(int(row.batch_index), trade_count)
    service = trust_service or TrustProofService()
    result = await service.submit_merkle_root(
        MerkleSubmitParams(
            panda_object_id=panda.sui_object_id,
            root_hash=row.root_hash,
            trade_count=trade_count,
            start_trade_id=start_id,
            end_trade_id=end_id,
            batch_index=int(row.batch_index),
        )
    )
    row.sui_tx_digest = result.tx_digest
    row.submitted_at = datetime.now(timezone.utc)
    await session.flush()
    logger.info(
        "Merkle batch %s for panda %s submitted tx=%s dry_run=%s",
        row.batch_index,
        row.panda_id,
        result.tx_digest[:16],
        result.dry_run,
    )
    return {
        "chain_status": "submitted" if not result.dry_run else "dry_run",
        "tx_digest": result.tx_digest,
        "dry_run": result.dry_run,
    }

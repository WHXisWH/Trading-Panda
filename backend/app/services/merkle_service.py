"""Merkle batch loading and status queries (Epic 9)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import MerkleRoot, TradeFact
from app.engine.merkle_worker import trade_fact_leaf
from app.services.review_service import trade_fact_to_dict


def merkle_root_to_dict(row: MerkleRoot) -> dict[str, Any]:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "root_hash": row.root_hash,
        "trade_count": int(row.trade_count),
        "batch_index": int(row.batch_index),
        "root_type": row.root_type or "trade_facts",
        "start_fact_id": row.start_fact_id,
        "end_fact_id": row.end_fact_id,
        "sui_tx_digest": row.sui_tx_digest,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "chain_status": "submitted" if row.sui_tx_digest else "pending",
    }


async def count_trade_facts(session: AsyncSession, panda_id: str) -> int:
    result = await session.execute(
        select(func.count()).select_from(TradeFact).where(TradeFact.panda_id == panda_id)
    )
    return int(result.scalar_one() or 0)


async def load_batch_facts(
    session: AsyncSession,
    panda_id: str,
    batch_index: int,
    *,
    batch_size: int | None = None,
) -> list[dict[str, Any]]:
    """Load one deterministic Trade Fact batch ordered by created_at ascending."""
    size = batch_size or settings.merkle_batch_size
    offset = max(0, (batch_index - 1) * size)
    rows = (
        await session.execute(
            select(TradeFact)
            .where(TradeFact.panda_id == panda_id)
            .order_by(TradeFact.created_at.asc(), TradeFact.id.asc())
            .offset(offset)
            .limit(size)
        )
    ).scalars().all()
    return [trade_fact_to_dict(row) for row in rows]


def batch_trade_id_range(batch_index: int, trade_count: int) -> tuple[int, int]:
    """Map batch index to on-chain inclusive u64 trade id range."""
    size = settings.merkle_batch_size
    start_id = (batch_index - 1) * size
    end_id = start_id + trade_count - 1
    return start_id, end_id


async def get_latest_merkle_root(
    session: AsyncSession,
    panda_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        select(MerkleRoot)
        .where(MerkleRoot.panda_id == panda_id)
        .order_by(MerkleRoot.batch_index.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return merkle_root_to_dict(row) if row else None


async def list_merkle_roots(
    session: AsyncSession,
    panda_id: str,
    *,
    limit: int = 10,
) -> list[dict[str, Any]]:
    result = await session.execute(
        select(MerkleRoot)
        .where(MerkleRoot.panda_id == panda_id)
        .order_by(MerkleRoot.batch_index.desc())
        .limit(limit)
    )
    return [merkle_root_to_dict(row) for row in result.scalars().all()]


def preview_batch_root(facts: list[dict[str, Any]]) -> str:
    from app.engine.merkle_worker import build_leaves_from_facts, compute_merkle_root

    return compute_merkle_root(build_leaves_from_facts(facts))


def fact_leaf_hash(fact: dict[str, Any]) -> str:
    return trade_fact_leaf(fact)

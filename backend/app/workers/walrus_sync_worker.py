"""WalrusSyncWorker — archive reviews and skill snapshots off hot path (Epic 9)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Awaitable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Panda, SkillMemory, SkillVersion, TradeReview
from app.integrations import walrus as walrus_client
from app.services.async_job_queue import enqueue_job
from app.services.review_service import review_to_dict, trade_fact_to_dict
from app.services.skill_memory_service import skill_memory_to_dict, skill_version_to_dict

logger = logging.getLogger(__name__)

UploadFn = Callable[[dict[str, Any]], Awaitable[str]]


async def enqueue_walrus_archive_job(
    session: AsyncSession,
    *,
    archive_type: str,
    panda_id: str,
    review_id: str | None = None,
    skill_version_id: str | None = None,
) -> None:
    key_parts = [archive_type, panda_id]
    if review_id:
        key_parts.append(review_id)
    if skill_version_id:
        key_parts.append(skill_version_id)

    await enqueue_job(
        session,
        job_type="walrus_archive_requested",
        idempotency_key=f"walrus:{'/'.join(key_parts)}",
        payload={
            "archive_type": archive_type,
            "panda_id": panda_id,
            "review_id": review_id,
            "skill_version_id": skill_version_id,
        },
        priority=150,
    )


async def process_walrus_archive_job(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    upload_fn: UploadFn | None = None,
) -> dict[str, Any]:
    archive_type = payload.get("archive_type", "skill_snapshot")
    panda_id = payload["panda_id"]

    if not _walrus_configured():
        await _mark_panda_walrus_status(session, panda_id, "failed")
        return {
            "status": "skipped",
            "reason": "walrus_not_configured",
            "archive_type": archive_type,
        }

    try:
        if archive_type == "review_batch":
            return await _archive_review(session, payload, upload_fn=upload_fn)
        return await _archive_skill_snapshot(session, payload, upload_fn=upload_fn)
    except Exception as exc:
        logger.warning("Walrus archive failed for panda=%s type=%s: %s", panda_id, archive_type, exc)
        await _mark_panda_walrus_status(session, panda_id, "failed")
        return {
            "status": "failed",
            "reason": "walrus_upload_failed",
            "archive_type": archive_type,
            "error": str(exc),
        }


def _walrus_configured() -> bool:
    return bool(
        (settings.walrus_publisher_url or "").strip()
        and (settings.walrus_aggregator_url or "").strip()
    )


async def _mark_panda_walrus_status(
    session: AsyncSession,
    panda_id: str,
    status: str,
    *,
    blob_id: str | None = None,
) -> None:
    panda = await session.get(Panda, panda_id)
    if panda is None:
        return
    panda.walrus_sync_status = status
    if blob_id:
        panda.walrus_blob_id = blob_id
        panda.walrus_last_synced_at = datetime.now(timezone.utc)
    await session.flush()


async def _archive_review(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    upload_fn: UploadFn | None,
) -> dict[str, Any]:
    review_id = payload.get("review_id")
    if not review_id:
        return {"status": "skipped", "reason": "missing_review_id"}

    review = await session.get(TradeReview, review_id)
    if review is None:
        return {"status": "skipped", "reason": "review_not_found"}

    from app.services.review_service import load_trade_fact

    fact = await load_trade_fact(session, review.panda_id, review.trade_fact_id)
    blob_payload = {
        "archive_type": "review_batch",
        "panda_id": review.panda_id,
        "review": review_to_dict(review),
        "trade_fact": trade_fact_to_dict(fact),
        "archived_at": datetime.now(timezone.utc).isoformat(),
    }
    blob_id = await _upload(blob_payload, upload_fn=upload_fn)

    await _mark_panda_walrus_status(session, review.panda_id, "synced", blob_id=blob_id)

    await session.flush()
    return {"status": "archived", "archive_type": "review_batch", "walrus_blob_id": blob_id}


async def _archive_skill_snapshot(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    upload_fn: UploadFn | None,
) -> dict[str, Any]:
    skill_version_id = payload.get("skill_version_id")
    panda_id = payload["panda_id"]
    if not skill_version_id:
        return {"status": "skipped", "reason": "missing_skill_version_id"}

    version_row = await session.get(SkillVersion, skill_version_id)
    if version_row is None or version_row.panda_id != panda_id:
        return {"status": "skipped", "reason": "skill_version_not_found"}

    if version_row.walrus_blob_id:
        return {
            "status": "already_archived",
            "walrus_blob_id": version_row.walrus_blob_id,
        }

    memories = (
        await session.execute(
            select(SkillMemory)
            .where(
                SkillMemory.panda_id == panda_id,
                SkillMemory.version == int(version_row.version),
            )
            .order_by(SkillMemory.created_at.asc())
        )
    ).scalars().all()

    blob_payload = {
        "archive_type": "skill_snapshot",
        "panda_id": panda_id,
        "skill_version": skill_version_to_dict(version_row),
        "memories": [skill_memory_to_dict(m) for m in memories],
        "archived_at": datetime.now(timezone.utc).isoformat(),
    }
    blob_id = await _upload(blob_payload, upload_fn=upload_fn)
    version_row.walrus_blob_id = blob_id
    await _mark_panda_walrus_status(session, panda_id, "synced", blob_id=blob_id)
    await session.flush()
    return {
        "status": "archived",
        "archive_type": "skill_snapshot",
        "walrus_blob_id": blob_id,
        "skill_version": int(version_row.version),
    }


async def _upload(payload: dict[str, Any], *, upload_fn: UploadFn | None) -> str:
    if upload_fn is not None:
        return await upload_fn(payload)
    return await walrus_client.upload_blob(payload)

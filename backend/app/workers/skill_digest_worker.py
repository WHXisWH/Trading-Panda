"""SkillDigestWorker — async skill version digest chain submit (Epic 9)."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Panda, SkillVersion
from app.services.async_job_queue import enqueue_job
from app.services.trust_proof_service import SkillDigestParams, TrustProofService

logger = logging.getLogger(__name__)


async def enqueue_skill_digest_job(
    session: AsyncSession,
    *,
    panda_id: str,
    skill_version: int,
    skill_version_id: str,
) -> None:
    await enqueue_job(
        session,
        job_type="skill_digest_requested",
        idempotency_key=f"skill_digest:{panda_id}:{skill_version}",
        payload={
            "panda_id": panda_id,
            "skill_version": skill_version,
            "skill_version_id": skill_version_id,
        },
        priority=130,
    )


async def process_skill_digest_job(
    session: AsyncSession,
    payload: dict[str, Any],
    *,
    trust_service: TrustProofService | None = None,
) -> dict[str, Any]:
    panda_id = payload["panda_id"]
    skill_version = int(payload["skill_version"])
    skill_version_id = payload.get("skill_version_id")

    query = select(SkillVersion).where(
        SkillVersion.panda_id == panda_id,
        SkillVersion.version == skill_version,
    )
    if skill_version_id:
        query = query.where(SkillVersion.id == skill_version_id)

    row = (await session.execute(query)).scalar_one_or_none()
    if row is None:
        return {"status": "skipped", "reason": "skill_version_not_found"}

    if row.submitted_tx_digest:
        return {
            "status": "already_submitted",
            "skill_version": skill_version,
            "tx_digest": row.submitted_tx_digest,
        }

    if not settings.skill_digest_enabled:
        return {"status": "pending", "reason": "skill_digest_disabled"}

    panda = await session.get(Panda, panda_id)
    if panda is None or not panda.sui_object_id:
        return {"status": "pending", "reason": "panda_object_missing"}

    service = trust_service or TrustProofService()
    result = await service.submit_skill_digest(
        SkillDigestParams(
            panda_object_id=panda.sui_object_id,
            skill_version=skill_version,
            skill_hash=row.skill_hash,
        )
    )
    row.submitted_tx_digest = result.tx_digest
    await session.flush()
    logger.info(
        "Skill digest v%s for panda %s tx=%s dry_run=%s",
        skill_version,
        panda_id,
        result.tx_digest[:16],
        result.dry_run,
    )
    return {
        "status": "submitted" if not result.dry_run else "dry_run",
        "skill_version": skill_version,
        "tx_digest": result.tx_digest,
        "dry_run": result.dry_run,
    }

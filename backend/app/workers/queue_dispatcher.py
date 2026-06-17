"""Dispatch pending async_jobs to workers."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AsyncJob
from app.workers.review_worker import process_review_job
from app.workers.skill_memory_worker import process_skill_memory_job
from app.workers.chain_execution_worker import process_chain_proof_job
from app.workers.merkle_worker import process_merkle_batch_job
from app.workers.skill_digest_worker import process_skill_digest_job
from app.workers.walrus_sync_worker import process_walrus_archive_job

logger = logging.getLogger(__name__)

REVIEW_JOB_TYPES = {"position_closed", "review_requested"}
SKILL_JOB_TYPES = {"review_completed"}
CHAIN_PROOF_JOB_TYPES = {"chain_proof_requested"}
MERKLE_JOB_TYPES = {"merkle_batch_ready"}
SKILL_DIGEST_JOB_TYPES = {"skill_digest_requested"}
WALRUS_JOB_TYPES = {"walrus_archive_requested"}


async def dispatch_job(session: AsyncSession, job: AsyncJob) -> dict[str, Any]:
    job.status = "running"
    job.attempts = int(job.attempts or 0) + 1
    await session.flush()

    try:
        if job.job_type in REVIEW_JOB_TYPES:
            result = await process_review_job(session, job.payload or {})
        elif job.job_type in SKILL_JOB_TYPES:
            result = await process_skill_memory_job(session, job.payload or {})
        elif job.job_type in CHAIN_PROOF_JOB_TYPES:
            result = await process_chain_proof_job(session, job.payload or {})
        elif job.job_type in MERKLE_JOB_TYPES:
            result = await process_merkle_batch_job(session, job.payload or {})
        elif job.job_type in SKILL_DIGEST_JOB_TYPES:
            result = await process_skill_digest_job(session, job.payload or {})
        elif job.job_type in WALRUS_JOB_TYPES:
            result = await process_walrus_archive_job(session, job.payload or {})
        else:
            raise ValueError(f"Unknown job type: {job.job_type}")
        job.status = "completed"
        return result
    except Exception as exc:
        job.status = "failed" if job.attempts >= job.max_attempts else "pending"
        job.last_error = str(exc)
        await session.commit()
        raise


async def process_pending_jobs(
    session: AsyncSession,
    *,
    limit: int = 10,
    worker_id: str = "local",
) -> list[dict[str, Any]]:
    result = await session.execute(
        select(AsyncJob)
        .where(AsyncJob.status == "pending")
        .order_by(AsyncJob.priority.asc(), AsyncJob.run_at.asc())
        .limit(limit)
    )
    jobs = result.scalars().all()
    outcomes: list[dict[str, Any]] = []
    for job in jobs:
        job.locked_by = worker_id
        try:
            outcomes.append({"job_id": job.id, "result": await dispatch_job(session, job)})
            await session.commit()
        except Exception as exc:
            logger.warning("Job %s failed: %s", job.id, exc)
            outcomes.append({"job_id": job.id, "error": str(exc)})
    return outcomes

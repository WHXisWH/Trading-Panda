"""Enqueue durable async jobs (PostgreSQL async_jobs)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AsyncJob


async def enqueue_job(
    session: AsyncSession,
    *,
    job_type: str,
    idempotency_key: str,
    payload: dict[str, Any],
    priority: int = 100,
    run_at: datetime | None = None,
) -> AsyncJob | None:
    existing = await session.execute(
        select(AsyncJob).where(AsyncJob.idempotency_key == idempotency_key)
    )
    if existing.scalar_one_or_none() is not None:
        return None

    job = AsyncJob(
        job_type=job_type,
        status="pending",
        priority=priority,
        run_at=run_at or datetime.now(timezone.utc),
        idempotency_key=idempotency_key,
        payload=payload,
    )
    session.add(job)
    return job

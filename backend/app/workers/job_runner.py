"""Background poller for PostgreSQL async_jobs."""

from __future__ import annotations

import asyncio
import logging

from app.config import settings
import app.db.database as database
from app.db.database import ensure_engine
from app.workers.queue_dispatcher import process_pending_jobs

logger = logging.getLogger(__name__)


class AsyncJobRunner:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    async def start(self) -> None:
        if not settings.async_job_worker_enabled:
            return
        ensure_engine()
        if database.AsyncSessionLocal is None:
            logger.warning("Async job runner skipped — DATABASE_URL not configured")
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._loop(), name="async-job-runner")
        logger.info(
            "Async job runner started (interval=%ss)",
            settings.async_job_poll_interval_sec,
        )

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        interval = max(1, int(settings.async_job_poll_interval_sec))
        while not self._stop.is_set():
            try:
                async with database.AsyncSessionLocal() as session:
                    outcomes = await process_pending_jobs(
                        session,
                        limit=settings.async_job_batch_size,
                        worker_id="backend-poller",
                    )
                    if outcomes:
                        logger.debug("Processed %d async jobs", len(outcomes))
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Async job poll failed: %s", exc)
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=interval)
            except asyncio.TimeoutError:
                continue


job_runner = AsyncJobRunner()

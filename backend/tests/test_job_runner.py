"""Async job runner smoke tests."""

import pytest

from app.workers import job_runner as job_runner_module


@pytest.mark.asyncio
async def test_job_runner_start_stop_without_database(monkeypatch):
    monkeypatch.setattr(job_runner_module.settings, "async_job_worker_enabled", True)
    runner = job_runner_module.AsyncJobRunner()
    await runner.start()
    await runner.stop()

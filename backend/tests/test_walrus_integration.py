"""Walrus JSON serialization helpers."""

import json
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.integrations.walrus import _blob_id_from_store_response, _json_default
from app.db.models import Panda, SkillVersion
from app.services.skill_memory_service import walrus_archive_status_from_job
from app.workers.walrus_sync_worker import process_walrus_archive_job


def test_walrus_json_default_serializes_review_payload_values():
    payload = {
        "closed_at": datetime(2026, 6, 20, tzinfo=timezone.utc),
        "realized_pnl": Decimal("10.5"),
    }
    encoded = json.dumps(payload, default=_json_default)
    assert "2026-06-20T00:00:00+00:00" in encoded
    assert "10.5" in encoded


def test_walrus_json_default_rejects_unknown_objects():
    with pytest.raises(TypeError):
        json.dumps({"bad": object()}, default=_json_default)


def test_walrus_blob_id_from_newly_created_response():
    assert (
        _blob_id_from_store_response({"newlyCreated": {"blobObject": {"blobId": "blob-new"}}})
        == "blob-new"
    )


def test_walrus_blob_id_from_already_certified_response():
    assert _blob_id_from_store_response({"alreadyCertified": {"blobId": "blob-old"}}) == "blob-old"


def test_walrus_archive_status_prefers_archived_blob():
    row = SimpleNamespace(walrus_blob_id="blob123")
    status = walrus_archive_status_from_job(row, None)

    assert status["status"] == "archived"
    assert status["walrus_blob_id"] == "blob123"


def test_walrus_archive_status_completed_without_blob_is_unavailable():
    row = SimpleNamespace(walrus_blob_id=None)
    job = SimpleNamespace(status="completed", last_error=None)
    status = walrus_archive_status_from_job(row, job)

    assert status["status"] == "unavailable"
    assert status["reason"] == "walrus_not_configured_or_unavailable"


@pytest.mark.asyncio
async def test_walrus_archive_marks_panda_failed_when_unconfigured(monkeypatch):
    panda = SimpleNamespace(walrus_sync_status="pending")
    session = AsyncMock()

    async def get_row(model, row_id):
        if model is Panda:
            return panda
        return None

    session.get.side_effect = get_row
    monkeypatch.setattr("app.workers.walrus_sync_worker._walrus_configured", lambda: False)

    result = await process_walrus_archive_job(
        session,
        {"archive_type": "skill_snapshot", "panda_id": "p1", "skill_version_id": "sv1"},
    )

    assert result == {
        "status": "skipped",
        "reason": "walrus_not_configured",
        "archive_type": "skill_snapshot",
    }
    assert panda.walrus_sync_status == "failed"
    session.flush.assert_awaited()


@pytest.mark.asyncio
async def test_walrus_archive_upload_error_becomes_visible_failure(monkeypatch):
    panda = SimpleNamespace(walrus_sync_status="pending")
    version = SimpleNamespace(
        id="sv1",
        panda_id="p1",
        version=1,
        skill_hash="hash",
        walrus_blob_id=None,
        submitted_tx_digest=None,
        created_at=None,
    )
    session = AsyncMock()

    async def get_row(model, row_id):
        if model is SkillVersion:
            return version
        if model is Panda:
            return panda
        return None

    memories_result = MagicMock()
    memories_result.scalars.return_value.all.return_value = []
    session.get.side_effect = get_row
    session.execute.return_value = memories_result
    monkeypatch.setattr("app.workers.walrus_sync_worker._walrus_configured", lambda: True)

    async def upload_fail(_payload):
        raise RuntimeError("publisher returned 404")

    result = await process_walrus_archive_job(
        session,
        {"archive_type": "skill_snapshot", "panda_id": "p1", "skill_version_id": "sv1"},
        upload_fn=upload_fail,
    )

    assert result["status"] == "failed"
    assert result["reason"] == "walrus_upload_failed"
    assert result["archive_type"] == "skill_snapshot"
    assert "publisher returned 404" in result["error"]
    assert panda.walrus_sync_status == "failed"
    assert version.walrus_blob_id is None
    session.flush.assert_awaited()

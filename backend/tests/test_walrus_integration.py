"""Walrus JSON serialization helpers."""

import json
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.integrations.walrus import _json_default


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

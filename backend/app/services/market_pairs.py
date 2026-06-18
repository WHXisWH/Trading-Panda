"""Market pair source shared by Agent Wallet policy and Chain Proof."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx

from app.config import settings


def configured_launch_pairs() -> list[str]:
    raw = settings.deepbook_launch_pairs.strip()
    if not raw:
        return ["DEEP-SUI", "SUI-USDC"]
    return [canonical_market_pair(p) for p in raw.split(",") if p.strip()]


def _normalize_monitor_base_url(base: str) -> str:
    """Local market-monitor serves HTTP; https://localhost breaks with SSL errors."""
    normalized = base.strip().rstrip("/")
    if not normalized:
        return ""
    parsed = urlparse(normalized)
    if parsed.scheme == "https" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        parsed = parsed._replace(scheme="http")
        normalized = urlunparse(parsed).rstrip("/")
    return normalized


def _dedupe_pairs(pairs: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for pair in pairs:
        normalized = canonical_market_pair(pair)
        if not normalized:
            continue
        key = normalized.upper()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def canonical_market_pair(value: str) -> str:
    """Single display/storage form: BASE-QUOTE (DeepBook monitor uses dashes)."""
    raw = value.strip()
    if not raw:
        return ""
    return raw.replace("_", "-").replace("/", "-")


async def _fetch_monitor_pairs_payload() -> dict[str, Any] | None:
    base = _normalize_monitor_base_url(settings.market_monitor_url)
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{base}/pairs", headers={"Accept": "application/json"})
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else None
    except (httpx.HTTPError, ValueError):
        return None


async def resolve_launch_pairs() -> list[str]:
    pinned = [canonical_market_pair(pair) for pair in configured_launch_pairs()]
    candidates = [*pinned]
    payload = await _fetch_monitor_pairs_payload()
    if payload:
        ranked = payload.get("pairs")
        if isinstance(ranked, list):
            candidates.extend(
                canonical_market_pair(str(row.get("pair") or row.get("pool") or ""))
                for row in ranked
                if isinstance(row, dict)
            )

        launch = payload.get("launch_pairs")
        if isinstance(launch, list):
            candidates.extend(canonical_market_pair(str(pair)) for pair in launch)

    return _dedupe_pairs(candidates)

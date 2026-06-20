"""Training pair catalog — aligned with Agent Wallet and market-monitor pairs."""

from __future__ import annotations

from app.services.market_pairs import canonical_market_pair, configured_launch_pairs


def _configured_pools() -> list[str]:
    return [canonical_market_pair(pair) for pair in configured_launch_pairs()]


MVP_POOLS = frozenset(_configured_pools())

POOL_CATALOG: list[dict[str, str | bool]] = [
    {
        "id": pair,
        "name": pair,
        "description": f"DeepBook · {pair.replace('-', ' / ')}",
        "recommended": index == 0,
    }
    for index, pair in enumerate(_configured_pools())
]


def max_pools_for_focus(focus: int) -> int:
    """PRD: 1 + focus//25, capped to configured launch-pair count."""
    return min(len(MVP_POOLS), max(1, 1 + int(focus) // 25))


def normalize_subscribed_pools(raw: object | None) -> list[str]:
    if not isinstance(raw, list):
        return [_configured_pools()[0]]
    pools = [
        canonical_market_pair(str(p))
        for p in raw
        if canonical_market_pair(str(p)) in MVP_POOLS
    ]
    return pools or [_configured_pools()[0]]

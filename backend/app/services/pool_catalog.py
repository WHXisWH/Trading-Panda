"""MVP DeepBook pool catalog — aligned with market-monitor DEEPBOOK_POOLS."""

from __future__ import annotations

MVP_POOLS = frozenset({"DEEP/SUI", "SUI/DBUSDC"})

POOL_CATALOG: list[dict[str, str | bool]] = [
    {
        "id": "DEEP/SUI",
        "name": "DEEP/SUI",
        "description": "DeepBook Testnet · DEEP / SUI",
        "recommended": True,
    },
    {
        "id": "SUI/DBUSDC",
        "name": "SUI/DBUSDC",
        "description": "DeepBook Testnet · SUI / DBUSDC",
        "recommended": False,
    },
]


def max_pools_for_focus(focus: int) -> int:
    """PRD: 1 + focus//25, capped to MVP pool count (2)."""
    return min(len(MVP_POOLS), max(1, 1 + int(focus) // 25))


def normalize_subscribed_pools(raw: object | None) -> list[str]:
    if not isinstance(raw, list):
        return ["DEEP/SUI"]
    pools = [str(p) for p in raw if str(p) in MVP_POOLS]
    return pools or ["DEEP/SUI"]

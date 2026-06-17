"""DeepBook pair registry — launch priorities and pair metadata."""

from __future__ import annotations

from dataclasses import dataclass

from broadcast.schemas import pool_to_pair

# Product priority pairs (PRD §7 / market-monitor-design §3.2).
LAUNCH_PAIR_PRIORITY: tuple[str, ...] = (
    "SUI_USDC",
    "DEEP_USDC",
    "WAL_USDC",
    "NS_USDC",
)

# Temporary compatibility when indexer still runs on testnet sparse pools.
TESTNET_FALLBACK_POOLS: tuple[str, ...] = (
    "DEEP/SUI",
    "SUI/DBUSDC",
)

STABLE_QUOTES: frozenset[str] = frozenset({"USDC", "USDT", "DBUSDC"})

# Known asset decimals for launch pairs when DeepBook catalog omits them.
KNOWN_ASSET_DECIMALS: dict[str, int] = {
    "SUI": 9,
    "USDC": 6,
    "USDT": 6,
    "DBUSDC": 6,
    "DEEP": 6,
    "WAL": 9,
    "NS": 9,
}


@dataclass(frozen=True)
class PairMeta:
    pool: str
    pair: str
    base_asset: str
    quote_asset: str
    pool_id: str | None = None
    stable_quote: bool = False
    launch_priority: int | None = None
    is_fallback: bool = False
    min_tick_size: float | None = None
    base_decimals: int | None = None
    quote_decimals: int | None = None


def parse_pool_assets(pool: str) -> tuple[str, str]:
    """Parse base/quote from DeepBook pool id (SUI_USDC or DEEP/SUI)."""
    normalized = pool.strip().replace("-", "_")
    if "/" in normalized:
        base, _, quote = normalized.partition("/")
    elif "_" in normalized:
        base, _, quote = normalized.partition("_")
    else:
        base, quote = normalized, "USDC"
    return base.upper(), quote.upper()


def launch_priority_for(pool: str) -> int | None:
    """Return 0-based launch priority or None if not a launch pair."""
    canonical = pool.strip().replace("/", "_").upper()
    for idx, launch in enumerate(LAUNCH_PAIR_PRIORITY):
        if canonical == launch.upper():
            return idx
    return None


def is_fallback_pool(pool: str) -> bool:
    key = pool.strip()
    return key in TESTNET_FALLBACK_POOLS or key.replace("_", "/") in TESTNET_FALLBACK_POOLS


def _default_decimals(asset: str) -> int | None:
    return KNOWN_ASSET_DECIMALS.get(asset.upper())


def _min_tick_from_quote_decimals(quote_decimals: int | None) -> float | None:
    if quote_decimals is None:
        return None
    return 10 ** (-quote_decimals)


def build_pair_meta(
    pool: str,
    pool_id: str | None = None,
    *,
    base_decimals: int | None = None,
    quote_decimals: int | None = None,
    min_tick_size: float | None = None,
) -> PairMeta:
    base, quote = parse_pool_assets(pool)
    pair = pool_to_pair(pool)
    priority = launch_priority_for(pool)
    resolved_base = base_decimals if base_decimals is not None else _default_decimals(base)
    resolved_quote = quote_decimals if quote_decimals is not None else _default_decimals(quote)
    resolved_tick = min_tick_size
    if resolved_tick is None:
        resolved_tick = _min_tick_from_quote_decimals(resolved_quote)
    return PairMeta(
        pool=pool,
        pair=pair,
        base_asset=base,
        quote_asset=quote,
        pool_id=pool_id,
        stable_quote=quote in STABLE_QUOTES,
        launch_priority=priority,
        is_fallback=is_fallback_pool(pool),
        min_tick_size=resolved_tick,
        base_decimals=resolved_base,
        quote_decimals=resolved_quote,
    )


def preferred_pool_candidates(
    discovered: list[str],
    *,
    network: str = "mainnet",
) -> list[str]:
    """Order discovered pools: launch pairs first, then fallbacks on testnet."""
    seen: set[str] = set()
    ordered: list[str] = []

    def add(pool: str) -> None:
        key = pool.strip()
        if not key or key in seen:
            return
        seen.add(key)
        ordered.append(key)

    if network == "mainnet":
        for launch in LAUNCH_PAIR_PRIORITY:
            for pool in discovered:
                if launch_priority_for(pool) == launch_priority_for(launch):
                    add(pool)
        for pool in discovered:
            add(pool)
        return ordered

    for pool in discovered:
        if launch_priority_for(pool) is not None:
            add(pool)
    for fallback in TESTNET_FALLBACK_POOLS:
        if fallback in discovered:
            add(fallback)
    for pool in discovered:
        add(pool)
    return ordered

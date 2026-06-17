"""Discover DeepBook pool names via Sui JSON-RPC (suix_queryEvents).

DeepBook v3 emits ``PoolCreated`` from module ``pool``; the on-chain event ``type``
string includes generic coin types, e.g.
``0xdee9::pool::PoolCreated<0x2::sui::SUI, 0x...::usdc::USDC>``. We derive the
Server pool id ``SUI_USDC`` from the last ``::`` segment of each type argument.

See ``docs/market-monitor-design.md`` §4.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def pool_name_from_pool_created_type(event_type: str, *, module: str) -> str | None:
    """Parse ``BASE_QUOTE`` pool id from a Move event ``type`` string.

    Matches ``...::{module}::PoolCreated<...>`` case-insensitively on the path
    segment so it works with canonical ``0x`` package addresses.
    """
    if not event_type:
        return None
    mod = module.strip()
    needle = f"::{mod}::PoolCreated<"
    lower = event_type.lower()
    pos = lower.find(needle.lower())
    if pos < 0:
        return None
    inner_start = pos + len(needle)
    depth = 0
    inner_end = -1
    j = inner_start
    while j < len(event_type):
        c = event_type[j]
        if c == "<":
            depth += 1
        elif c == ">":
            if depth == 0:
                inner_end = j
                break
            depth -= 1
        j += 1
    if inner_end < 0:
        return None
    inner = event_type[inner_start:inner_end].strip()
    if not inner:
        return None
    parts = _split_top_level_types(inner)
    if len(parts) != 2:
        logger.debug("unexpected PoolCreated type args: %s", inner)
        return None
    base_sym = _type_arg_to_symbol(parts[0])
    quote_sym = _type_arg_to_symbol(parts[1])
    if not base_sym or not quote_sym:
        return None
    return f"{base_sym}_{quote_sym}".upper()


def _type_arg_to_symbol(tp: str) -> str:
    """Last ``::`` segment, or innermost type inside ``Outer<Inner>``."""
    tp = tp.strip()
    if "<" in tp and ">" in tp:
        start = tp.rfind("<") + 1
        end = tp.rfind(">")
        if end > start:
            inner = tp[start:end]
            return inner.split("::")[-1].strip()
    segs = tp.split("::")
    return segs[-1].strip() if segs else tp


def _split_top_level_types(inner: str) -> list[str]:
    """Split ``A, B`` where A/B may contain ``<...>`` (comma inside generics)."""
    depth = 0
    start = 0
    parts: list[str] = []
    for i, ch in enumerate(inner):
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth = max(0, depth - 1)
        elif ch == "," and depth == 0:
            parts.append(inner[start:i].strip())
            start = i + 1
    parts.append(inner[start:].strip())
    return [p for p in parts if p]


async def discover_pools_via_rpc(
    rpc_url: str,
    package_id: str,
    *,
    pool_module: str = "pool",
    limit_per_page: int = 50,
    max_pages: int = 20,
    descending: bool = False,
    timeout: float = 30.0,
) -> list[str]:
    """
    Query ``suix_queryEvents`` with ``MoveModule`` filter, parse ``PoolCreated`` types.

    Returns deduplicated pool names (e.g. ``SUI_USDC``) suitable for
    ``/ohclv/{pool}`` and ``/orderbook/{pool}`` on DeepBook Server.
    """
    if not rpc_url or not package_id:
        return []

    seen: set[str] = set()
    out: list[str] = []
    cursor: str | None = None
    pkg_display = package_id if package_id.startswith("0x") else f"0x{package_id}"

    async with httpx.AsyncClient(timeout=timeout) as client:
        for _ in range(max_pages):
            params: list[Any] = [
                {"MoveModule": {"package": pkg_display, "module": pool_module}},
                cursor,
                limit_per_page,
                descending,
            ]
            result = await _sui_rpc(client, rpc_url, "suix_queryEvents", params)
            data = result.get("data") or []
            if not isinstance(data, list):
                break
            for ev in data:
                if not isinstance(ev, dict):
                    continue
                etype = ev.get("type") or ev.get("typeString") or ""
                if not isinstance(etype, str):
                    continue
                if "PoolCreated" not in etype:
                    continue
                name = pool_name_from_pool_created_type(etype, module=pool_module)
                if name and name not in seen:
                    seen.add(name)
                    out.append(name)

            cursor = result.get("nextCursor")
            has_next = result.get("hasNextPage")
            if not has_next or not cursor:
                break

    return out


async def _sui_rpc(
    client: httpx.AsyncClient, rpc_url: str, method: str, params: list[Any]
) -> dict[str, Any]:
    body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    r = await client.post(rpc_url.rstrip("/"), json=body, headers={"Content-Type": "application/json"})
    r.raise_for_status()
    payload = r.json()
    if "error" in payload and payload["error"]:
        err = payload["error"]
        raise RuntimeError(str(err))
    res = payload.get("result")
    if not isinstance(res, dict):
        return {}
    return res


def is_valid_pool_token(pool: str) -> bool:
    key = pool.strip()
    if not key:
        return False
    lower = key.lower()
    if lower.startswith(("http://", "https://")):
        return False
    if "/" in key and "://" in key:
        return False
    return True


def normalize_pool_list(pools: list[str]) -> list[str]:
    """Dedupe while preserving order; drop mistaken URLs."""
    seen: set[str] = set()
    out: list[str] = []
    for p in pools:
        key = p.strip()
        if not is_valid_pool_token(key):
            logger.warning("skip invalid pool entry (looks like URL?): %s", key)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out

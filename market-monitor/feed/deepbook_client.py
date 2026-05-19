import logging
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Candle:
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: float


class DeepBookClient:
    def __init__(self, base_url: str, timeout: float = 15.0) -> None:
        self._base = base_url.rstrip("/")
        self._timeout = timeout

    async def ping(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                r = await client.get(f"{self._base}/")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def get_pools(self) -> list[str]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(f"{self._base}/get_pools")
            r.raise_for_status()
            data = r.json()
        return _parse_pool_list(data)

    async def get_ohlcv(
        self, pool: str, period: str = "1m", limit: int = 60
    ) -> list[Candle]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/ohclv/{pool}",
                params={"period": period, "limit": limit},
            )
            r.raise_for_status()
            data = r.json()
        return _parse_candles(data)

    async def get_orderbook(self, pool: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(f"{self._base}/orderbook/{pool}")
            r.raise_for_status()
            data = r.json()
        if isinstance(data, dict):
            return data
        return {}

    async def get_trades(self, pool: str, limit: int = 5) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/trades/{pool}",
                params={"limit": limit},
            )
            r.raise_for_status()
            data = r.json()
        if isinstance(data, list):
            return [t for t in data if isinstance(t, dict)]
        return []


def _parse_pool_list(data: Any) -> list[str]:
    if isinstance(data, list):
        return [str(p) for p in data if p]
    if isinstance(data, dict):
        pools = data.get("pools") or data.get("data")
        if isinstance(pools, list):
            return [str(p) for p in pools if p]
    return []


def _parse_candles(data: Any) -> list[Candle]:
    rows = data
    if isinstance(data, dict):
        rows = data.get("candles") or data.get("data") or data.get("ohclv") or []
    if not isinstance(rows, list):
        return []

    candles: list[Candle] = []
    for row in rows:
        c = _parse_one_candle(row)
        if c is not None:
            candles.append(c)
    candles.sort(key=lambda x: x.timestamp)
    return candles


def _parse_one_candle(row: Any) -> Candle | None:
    if not isinstance(row, dict):
        return None
    try:
        ts = row.get("timestamp") or row.get("open_time") or row.get("time") or row.get("t")
        if ts is None:
            return None
        ts_f = float(ts)
        if ts_f > 1e12:
            ts_f /= 1000.0
        o = float(row.get("open") or row.get("o"))
        h = float(row.get("high") or row.get("h"))
        l = float(row.get("low") or row.get("l"))
        c = float(row.get("close") or row.get("c"))
        v = float(row.get("volume") or row.get("v") or 0)
        return Candle(open=o, high=h, low=l, close=c, volume=v, timestamp=ts_f)
    except (TypeError, ValueError):
        logger.debug("skip unparseable candle row: %s", row)
        return None

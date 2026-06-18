import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)


def encode_pool_for_path(pool: str) -> str:
    """Encode pool_name for URL path (e.g. DEEP/SUI → DEEP%2FSUI)."""
    return quote(pool.strip(), safe="")


@dataclass(frozen=True)
class Candle:
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: float


@dataclass(frozen=True)
class PoolCatalogEntry:
    pool_id: str
    base_decimals: int | None = None
    quote_decimals: int | None = None
    min_tick_size: float | None = None


def _optional_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_pool_catalog(data: Any) -> dict[str, PoolCatalogEntry]:
    """Extract pool metadata from /get_pools response."""
    out: dict[str, PoolCatalogEntry] = {}
    rows = data
    if isinstance(data, dict):
        rows = data.get("pools") or data.get("data") or []
    if not isinstance(rows, list):
        return out

    for item in rows:
        if not isinstance(item, dict):
            continue
        pool_id = item.get("pool_id")
        pool_name = item.get("pool_name") or item.get("name")
        if not pool_id or not pool_name:
            continue
        pid = str(pool_id).strip()
        name = str(pool_name).strip()
        entry = PoolCatalogEntry(
            pool_id=pid,
            base_decimals=_optional_int(
                item.get("base_asset_decimals")
                or item.get("base_decimals")
                or item.get("base_asset_decimal")
            ),
            quote_decimals=_optional_int(
                item.get("quote_asset_decimals")
                or item.get("quote_decimals")
                or item.get("quote_asset_decimal")
            ),
            min_tick_size=_optional_float(
                item.get("min_tick_size") or item.get("tick_size")
            ),
        )
        out[name] = entry
        alt = name.replace("/", "_")
        if alt != name:
            out[alt] = entry
    return out


def parse_pool_directory(data: Any) -> dict[str, str]:
    """Map pool_name → pool_id (hex) from /get_pools response."""
    return {name: entry.pool_id for name, entry in parse_pool_catalog(data).items()}


class DeepBookClient:
    def __init__(
        self,
        base_url: str,
        timeout: float = 15.0,
        orderbook_depth: int = 10,
        orderbook_level: int = 2,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._timeout = timeout
        self._orderbook_depth = orderbook_depth
        self._orderbook_level = orderbook_level

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

    async def fetch_pool_directory(self) -> dict[str, str]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(f"{self._base}/get_pools")
            r.raise_for_status()
            data = r.json()
        return parse_pool_directory(data)

    async def fetch_pool_catalog(self) -> dict[str, PoolCatalogEntry]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(f"{self._base}/get_pools")
            r.raise_for_status()
            data = r.json()
        return parse_pool_catalog(data)

    async def get_ohlcv(
        self,
        pool: str,
        period: str = "1m",
        limit: int = 60,
        *,
        start_time: int | None = None,
        end_time: int | None = None,
    ) -> list[Candle]:
        path_pool = encode_pool_for_path(pool)
        params: dict[str, str | int] = {"interval": period, "limit": limit}
        # DeepBook indexer expects millisecond Unix timestamps for window queries.
        if start_time is not None:
            params["start_time"] = int(start_time) * 1000
        if end_time is not None:
            params["end_time"] = int(end_time) * 1000
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/ohclv/{path_pool}",
                params=params,
            )
            r.raise_for_status()
            data = r.json()
        return _parse_candles(data)

    async def get_historical_volume(
        self,
        pool: str,
        *,
        start_time: int | None = None,
        end_time: int | None = None,
        volume_in_base: bool = False,
    ) -> float:
        """Quote/base volume in raw on-chain units (divide by asset decimals)."""
        path_pool = encode_pool_for_path(pool)
        params: dict[str, str | int] = {}
        if start_time is not None:
            params["start_time"] = start_time
        if end_time is not None:
            params["end_time"] = end_time
        if volume_in_base:
            params["volume_in_base"] = "true"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/historical_volume/{path_pool}",
                params=params or None,
            )
            r.raise_for_status()
            data = r.json()
        return _parse_historical_volume(data, pool)

    async def get_volume_stats(
        self,
        pool: str,
        *,
        quote_decimals: int = 6,
        now: float | None = None,
    ) -> tuple[float, float]:
        """Return (volume_24h, volume_7d) in quote notional."""
        import time

        clock = int(time.time() if now is None else now)
        scale = 10 ** max(quote_decimals, 0)
        raw_24h = await self.get_historical_volume(
            pool, start_time=clock - 86_400, end_time=clock
        )
        raw_7d = await self.get_historical_volume(
            pool, start_time=clock - 604_800, end_time=clock
        )
        return raw_24h / scale, raw_7d / scale

    async def get_orderbook(self, pool: str) -> dict[str, Any]:
        path_pool = encode_pool_for_path(pool)
        params = {"depth": self._orderbook_depth, "level": self._orderbook_level}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/orderbook/{path_pool}",
                params=params,
            )
            r.raise_for_status()
            data = r.json()
        if isinstance(data, dict):
            return data
        return {}

    async def get_trades(self, pool: str, limit: int = 5) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{self._base}/trades/{encode_pool_for_path(pool)}",
                params={"limit": limit},
            )
            r.raise_for_status()
            data = r.json()
        if isinstance(data, list):
            return [t for t in data if isinstance(t, dict)]
        return []


def _parse_pool_list(data: Any) -> list[str]:
    """Extract pool_name (or pool_id) from DeepBook /get_pools JSON."""
    names: list[str] = []
    rows = data
    if isinstance(data, dict):
        rows = data.get("pools") or data.get("data") or []
    if not isinstance(rows, list):
        return []

    for item in rows:
        if isinstance(item, dict):
            name = item.get("pool_name") or item.get("name")
            pool_id = item.get("pool_id")
            if name:
                names.append(str(name).strip())
            elif pool_id:
                names.append(str(pool_id).strip())
        elif isinstance(item, str):
            key = item.strip()
            if key and not key.startswith(("http://", "https://")):
                names.append(key)
    return names


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


def _parse_historical_volume(data: Any, pool: str) -> float:
    if not isinstance(data, dict):
        return 0.0
    keys = (
        pool,
        pool.replace("/", "_"),
        pool.replace("_", "/"),
    )
    for key in keys:
        if key in data:
            try:
                return float(data[key])
            except (TypeError, ValueError):
                return 0.0
    return 0.0


def _parse_one_candle(row: Any) -> Candle | None:
    if isinstance(row, (list, tuple)) and len(row) >= 6:
        try:
            ts_f = float(row[0])
            if ts_f > 1e12:
                ts_f /= 1000.0
            o = float(row[1])
            h = float(row[2])
            l = float(row[3])
            c = float(row[4])
            v = float(row[5])
            return Candle(open=o, high=h, low=l, close=c, volume=v, timestamp=ts_f)
        except (TypeError, ValueError):
            logger.debug("skip unparseable candle array: %s", row)
            return None

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

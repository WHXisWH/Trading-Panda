"""PostgreSQL order_fills → OHLCV (Plan A)."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, TYPE_CHECKING

from feed.deepbook_client import Candle
from feed.pair_registry import is_fallback_pool

if TYPE_CHECKING:
    import asyncpg
from pipeline.kline_aggregate import FillRow, fills_to_candles, interval_to_seconds

logger = logging.getLogger(__name__)


def resolve_window_start(
    *,
    since_sec: float | None,
    lookback_sec: float | None,
    interval: str,
    limit: int,
    now: float | None = None,
) -> float:
    """Compute PG query start time (epoch seconds)."""
    clock = time.time() if now is None else now
    if since_sec is not None:
        return since_sec
    if lookback_sec is not None and lookback_sec > 0:
        return clock - lookback_sec
    span = interval_to_seconds(interval) * max(limit, 1)
    return clock - span


@dataclass(frozen=True)
class FillsSchema:
    id_col: str | None
    pool_col: str
    ts_expr: str
    price_expr: str
    qty_expr: str


def _pick_column(columns: set[str], candidates: tuple[str, ...]) -> str | None:
    for name in candidates:
        if name in columns:
            return name
    return None


def build_schema(columns: set[str]) -> FillsSchema:
    id_col = _pick_column(columns, ("id", "fill_id", "event_id"))
    pool_col = _pick_column(columns, ("pool_name", "pool_id", "pool")) or "pool_id"
    ts_col = _pick_column(
        columns,
        ("checkpoint_timestamp_ms", "timestamp_ms", "timestamp", "created_at"),
    )
    if ts_col is None:
        raise ValueError("order_fills has no recognizable timestamp column")

    if ts_col in ("checkpoint_timestamp_ms", "timestamp_ms"):
        ts_expr = f"({ts_col}::double precision / 1000.0)"
    elif ts_col == "created_at":
        ts_expr = "EXTRACT(EPOCH FROM created_at)"
    else:
        ts_expr = f"({ts_col}::double precision)"

    price_col = _pick_column(columns, ("price", "fill_price", "execution_price"))
    if price_col is None:
        raise ValueError("order_fills has no recognizable price column")

    qty_col = _pick_column(
        columns,
        ("base_quantity", "quantity", "qty", "size", "quote_quantity"),
    )
    if qty_col is None:
        raise ValueError("order_fills has no recognizable quantity column")

    return FillsSchema(
        id_col=id_col,
        pool_col=pool_col,
        ts_expr=ts_expr,
        price_expr=price_col,
        qty_expr=qty_col,
    )


class FillsClient:
    def __init__(
        self,
        database_url: str,
        price_scale: float = 1e9,
        qty_scale: float = 1e9,
    ) -> None:
        self._database_url = database_url.strip()
        self._price_scale = price_scale if price_scale > 0 else 1.0
        self._qty_scale = qty_scale if qty_scale > 0 else 1.0
        self._pool: Any = None
        self._schema: FillsSchema | None = None
        self._pool_keys: dict[str, str] = {}
        self._pool_directory: dict[str, str] = {}

    @property
    def is_configured(self) -> bool:
        return bool(self._database_url)

    @property
    def schema(self) -> FillsSchema | None:
        return self._schema

    async def connect(self) -> None:
        if not self._database_url:
            return
        import asyncpg

        self._pool = await asyncpg.create_pool(
            self._database_url,
            min_size=1,
            max_size=4,
            command_timeout=30,
        )
        await self._load_schema()

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
        self._schema = None
        self._pool_keys.clear()

    async def ping(self) -> bool:
        if self._pool is None:
            return False
        try:
            async with self._pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            return False

    async def _load_schema(self) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'order_fills'
                """
            )
        columns = {str(r["column_name"]).lower() for r in rows}
        if not columns:
            raise ValueError("table public.order_fills not found")
        self._schema = build_schema(columns)
        logger.info(
            "order_fills schema pool=%s id=%s",
            self._schema.pool_col,
            self._schema.id_col,
        )

    def set_pool_directory(self, directory: dict[str, str]) -> None:
        self._pool_directory = dict(directory)
        self._pool_keys.clear()

    def _directory_lookup(self, pool: str) -> str | None:
        key = pool.strip()
        if key in self._pool_directory:
            return self._pool_directory[key]
        alt = key.replace("_", "/")
        if alt in self._pool_directory and not is_fallback_pool(alt):
            return self._pool_directory[alt]
        alt2 = key.replace("/", "_")
        if alt2 in self._pool_directory and not is_fallback_pool(key):
            return self._pool_directory[alt2]
        alt3 = key.replace("-", "_")
        if alt3 in self._pool_directory and alt3 != key:
            return self._pool_directory[alt3]
        return None

    async def resolve_pool_key(self, pool: str) -> str | None:
        if pool in self._pool_keys:
            return self._pool_keys[pool]

        schema = self._schema
        if schema is None or self._pool is None:
            return None

        if pool.startswith("0x"):
            self._pool_keys[pool] = pool
            return pool

        from_directory = self._directory_lookup(pool)
        if from_directory is not None:
            self._pool_keys[pool] = from_directory
            return from_directory

        if schema.pool_col == "pool_name":
            self._pool_keys[pool] = pool
            return pool

        mapped = await self._lookup_pool_id(pool)
        if mapped is not None:
            self._pool_keys[pool] = mapped
        return mapped

    async def _lookup_pool_id(self, pool: str) -> str | None:
        assert self._pool is not None
        base, _, quote = pool.replace("-", "_").partition("_")
        if not base or not quote:
            return None

        async with self._pool.acquire() as conn:
            has_pools = await conn.fetchval(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'pools'
                )
                """
            )
            if has_pools:
                try:
                    pool_cols = await conn.fetch(
                        """
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'pools'
                        """
                    )
                    names = {str(r["column_name"]).lower() for r in pool_cols}
                    id_col = _pick_column(names, ("pool_id", "id", "object_id"))
                    name_col = _pick_column(
                        names, ("pool_name", "name", "symbol")
                    )
                    if id_col and name_col:
                        row = await conn.fetchrow(
                            f"""
                            SELECT {id_col}::text AS pool_id
                            FROM pools
                            WHERE {name_col}::text ILIKE $1
                            LIMIT 1
                            """,
                            pool,
                        )
                        if row and row["pool_id"]:
                            return str(row["pool_id"])
                except Exception as exc:
                    logger.debug("pools lookup failed: %s", exc)

            schema = self._schema
            assert schema is not None
            logger.warning("pool %s unresolved; no matching pool_id found", pool)
        return None

    def _scaled(self, value: float, scale: float) -> float:
        if value is None:
            return 0.0
        v = float(value)
        if scale != 1.0 and v > 1_000_000:
            return v / scale
        return v

    def _row_to_fill(self, row: Any) -> FillRow:
        return FillRow(
            fill_id=int(row["fill_id"]),
            timestamp_sec=float(row["ts_sec"]),
            price=self._scaled(float(row["price_raw"]), self._price_scale),
            quantity=self._scaled(float(row["qty_raw"]), self._qty_scale),
        )

    async def count_fills(
        self,
        pool: str,
        *,
        since_sec: float | None = None,
    ) -> int:
        schema = self._schema
        pool_key = await self.resolve_pool_key(pool)
        if schema is None or self._pool is None or pool_key is None:
            return 0

        if since_sec is None:
            query = f"""
                SELECT COUNT(*)::int AS cnt
                FROM order_fills
                WHERE {schema.pool_col}::text = $1
            """
            args: tuple[Any, ...] = (pool_key,)
        else:
            query = f"""
                SELECT COUNT(*)::int AS cnt
                FROM order_fills
                WHERE {schema.pool_col}::text = $1
                  AND {schema.ts_expr} >= $2
            """
            args = (pool_key, since_sec)

        async with self._pool.acquire() as conn:
            val = await conn.fetchval(query, *args)
        return int(val or 0)

    async def fetch_fills_window(
        self,
        pool: str,
        interval: str,
        limit: int,
        since_sec: float | None = None,
        lookback_sec: float | None = None,
        before_sec: float | None = None,
    ) -> list[FillRow]:
        schema = self._schema
        pool_key = await self.resolve_pool_key(pool)
        if schema is None or self._pool is None or pool_key is None:
            return []

        start = resolve_window_start(
            since_sec=since_sec,
            lookback_sec=lookback_sec,
            interval=interval,
            limit=limit,
        )

        if schema.id_col:
            select_id = f"{schema.id_col} AS fill_id"
            order_by = f"{schema.id_col} ASC"
        else:
            select_id = (
                f"ROW_NUMBER() OVER (ORDER BY {schema.ts_expr} ASC)::bigint AS fill_id"
            )
            order_by = f"{schema.ts_expr} ASC"

        if before_sec is not None:
            query = f"""
                SELECT
                    {select_id},
                    {schema.ts_expr} AS ts_sec,
                    {schema.price_expr}::double precision AS price_raw,
                    {schema.qty_expr}::double precision AS qty_raw
                FROM order_fills
                WHERE {schema.pool_col}::text = $1
                  AND {schema.ts_expr} >= $2
                  AND {schema.ts_expr} < $3
                ORDER BY {order_by}
                LIMIT 500000
            """
            args: tuple[Any, ...] = (pool_key, start, before_sec)
        else:
            query = f"""
                SELECT
                    {select_id},
                    {schema.ts_expr} AS ts_sec,
                    {schema.price_expr}::double precision AS price_raw,
                    {schema.qty_expr}::double precision AS qty_raw
                FROM order_fills
                WHERE {schema.pool_col}::text = $1
                  AND {schema.ts_expr} >= $2
                ORDER BY {order_by}
                LIMIT 500000
            """
            args = (pool_key, start)

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
        return [self._row_to_fill(r) for r in rows]

    async def get_candles_page(
        self,
        pool: str,
        interval: str,
        limit: int,
        *,
        before_sec: float | None = None,
        start_sec: float | None = None,
    ) -> list[Candle]:
        fills = await self.fetch_fills_window(
            pool,
            interval,
            limit,
            since_sec=start_sec,
            before_sec=before_sec,
        )
        return fills_to_candles(fills, interval, limit)

    async def get_candles(
        self,
        pool: str,
        interval: str = "1m",
        limit: int = 60,
        lookback_sec: float | None = None,
    ) -> list[Candle]:
        fills = await self.fetch_fills_window(
            pool, interval, limit, lookback_sec=lookback_sec
        )
        return fills_to_candles(fills, interval, limit)

    async def get_volume_stats(
        self,
        pool: str,
        *,
        now: float | None = None,
    ) -> tuple[float, float]:
        """Return (volume_24h, volume_7d) as sum(price * qty) in quote terms."""
        import time

        clock = time.time() if now is None else now
        v24 = await self._sum_notional(pool, clock - 86_400)
        v7 = await self._sum_notional(pool, clock - 604_800)
        return v24, v7

    async def _sum_notional(self, pool: str, since_sec: float) -> float:
        schema = self._schema
        pool_key = await self.resolve_pool_key(pool)
        if schema is None or self._pool is None or pool_key is None:
            return 0.0
        query = f"""
            SELECT COALESCE(
                SUM(
                    ({schema.price_expr}::double precision / $3)
                    * ({schema.qty_expr}::double precision / $4)
                ),
                0
            ) AS notional
            FROM order_fills
            WHERE {schema.pool_col}::text = $1
              AND {schema.ts_expr} >= $2
        """
        async with self._pool.acquire() as conn:
            val = await conn.fetchval(
                query,
                pool_key,
                since_sec,
                self._price_scale,
                self._qty_scale,
            )
        return float(val or 0.0)

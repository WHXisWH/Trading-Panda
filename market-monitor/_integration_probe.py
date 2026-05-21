"""One-off integration probe: DeepBook + Redis."""
import asyncio
import json
import sys
import traceback

from config import get_settings
from feed.deepbook_client import DeepBookClient
from broadcast.publisher import RedisPublisher


async def main() -> int:
    settings = get_settings()
    out: dict = {
        "deepbook_server_url": settings.deepbook_server_url,
        "redis_url_set": bool(settings.redis_url),
    }

    client = DeepBookClient(settings.deepbook_server_url)
    try:
        out["deepbook_ping"] = await client.ping()
    except Exception as e:
        out["deepbook_ping"] = False
        out["deepbook_ping_error"] = str(e)

    pools: list[str] = []
    try:
        pools = await client.get_pools()
        out["pools"] = pools
        out["pools_count"] = len(pools)
    except Exception as e:
        out["pools_error"] = str(e)
        out["pools"] = []

    if pools:
        pool = pools[0]
        out["ohlcv_pool"] = pool
        try:
            candles = await client.get_ohlcv(pool, period=settings.candle_period, limit=5)
            out["ohlcv_count"] = len(candles)
            out["ohlcv_sample"] = [
                {"ts": c.timestamp, "close": c.close, "volume": c.volume}
                for c in candles[:3]
            ]
        except Exception as e:
            out["ohlcv_error"] = str(e)
    else:
        out["ohlcv_skipped"] = "no pools"

    pub = RedisPublisher(settings.redis_url)
    try:
        await pub.connect()
        out["redis_connected"] = pub.is_connected
    except Exception as e:
        out["redis_connected"] = False
        out["redis_error"] = str(e)
        traceback.print_exc(file=sys.stderr)
    finally:
        await pub.close()

    print(json.dumps(out, indent=2))
    ok = out.get("deepbook_ping") and out.get("redis_connected")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

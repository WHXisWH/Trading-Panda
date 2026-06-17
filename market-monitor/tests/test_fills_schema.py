import pytest

from feed.fills_client import FillsClient, build_schema


def test_build_schema_checkpoint_ms():
    schema = build_schema(
        {
            "id",
            "pool_id",
            "checkpoint_timestamp_ms",
            "price",
            "base_quantity",
        }
    )
    assert schema.pool_col == "pool_id"
    assert schema.id_col == "id"
    assert "checkpoint_timestamp_ms" in schema.ts_expr
    assert schema.qty_expr == "base_quantity"


def test_build_schema_no_id_column():
    schema = build_schema(
        {
            "pool_id",
            "checkpoint_timestamp_ms",
            "price",
            "base_quantity",
        }
    )
    assert schema.id_col is None


def test_build_schema_pool_name():
    schema = build_schema(
        {
            "id",
            "pool_name",
            "created_at",
            "price",
            "quantity",
        }
    )
    assert schema.pool_col == "pool_name"
    assert "created_at" in schema.ts_expr


def test_build_schema_missing_timestamp():
    with pytest.raises(ValueError):
        build_schema({"id", "pool_id", "price", "quantity"})


def test_directory_lookup_does_not_alias_mainnet_pool_to_testnet_fallback():
    client = FillsClient("postgresql://example")
    client.set_pool_directory({"DEEP/SUI": "0xtestnet_deep_sui"})

    assert client._directory_lookup("DEEP_SUI") is None


@pytest.mark.asyncio
async def test_unresolved_pool_does_not_fallback_to_busiest_pool(monkeypatch):
    client = FillsClient("postgresql://example")
    client._schema = build_schema(
        {
            "id",
            "pool_id",
            "checkpoint_timestamp_ms",
            "price",
            "base_quantity",
        }
    )
    client._pool = object()

    async def fake_lookup(pool: str) -> str | None:
        assert pool == "SUI_USDC"
        return None

    monkeypatch.setattr(client, "_lookup_pool_id", fake_lookup)

    assert await client.resolve_pool_key("SUI_USDC") is None


@pytest.mark.asyncio
async def test_lookup_pool_id_does_not_use_unrelated_busiest_pool():
    class FakeConn:
        async def fetchval(self, *_args, **_kwargs):
            return False

        async def fetchrow(self, *_args, **_kwargs):
            return {"pool_id": "0xtestnet_deep_sui"}

    class FakeAcquire:
        async def __aenter__(self):
            return FakeConn()

        async def __aexit__(self, *_args):
            return None

    class FakePool:
        def acquire(self):
            return FakeAcquire()

    client = FillsClient("postgresql://example")
    client._schema = build_schema(
        {
            "id",
            "pool_id",
            "checkpoint_timestamp_ms",
            "price",
            "base_quantity",
        }
    )
    client._pool = FakePool()

    assert await client.resolve_pool_key("SUI_USDC") is None

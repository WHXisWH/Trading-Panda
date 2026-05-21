import pytest

from feed.fills_client import build_schema


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

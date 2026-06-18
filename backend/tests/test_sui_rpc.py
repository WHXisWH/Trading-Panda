"""Tests for Sui RPC helpers."""

from app.services import sui_rpc


def test_get_transaction_block_accepts_options(monkeypatch):
    captured: dict = {}

    async def fake_sui_rpc(method: str, params: list) -> dict:
        captured["method"] = method
        captured["params"] = params
        return {"digest": params[0], "events": []}

    monkeypatch.setattr(sui_rpc, "sui_rpc", fake_sui_rpc)

    import asyncio

    result = asyncio.run(
        sui_rpc.get_transaction_block(
            "0xabc",
            options={"showObjectChanges": True},
        )
    )

    assert result["digest"] == "0xabc"
    assert captured["params"][1]["showObjectChanges"] is True
    assert captured["params"][1]["showEvents"] is True

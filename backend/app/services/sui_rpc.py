"""Minimal Sui JSON-RPC client for transaction / object reads."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings


async def sui_rpc(method: str, params: list[Any]) -> Any:
    url = settings.sui_rpc_url.rstrip("/")
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            url,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        res.raise_for_status()
        payload = res.json()
    if payload.get("error"):
        raise RuntimeError(payload["error"].get("message", "Sui RPC error"))
    return payload.get("result")


DEFAULT_TX_BLOCK_OPTIONS: dict[str, bool] = {
    "showInput": False,
    "showEffects": True,
    "showEvents": True,
    "showObjectChanges": False,
}


async def get_transaction_block(
    digest: str,
    *,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    query = {**DEFAULT_TX_BLOCK_OPTIONS, **(options or {})}
    return await sui_rpc(
        "sui_getTransactionBlock",
        [digest, query],
    )


async def get_object(object_id: str) -> dict[str, Any]:
    return await sui_rpc(
        "sui_getObject",
        [object_id, {"showOwner": True, "showContent": True}],
    )

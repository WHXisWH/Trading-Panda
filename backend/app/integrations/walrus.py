"""Walrus decentralized storage integration.

Used for:
- Backing up experience data (every 50 trades or before NFT transfer)
- Restoring experience data when a new owner receives a panda NFT

Doc ref: docs/database-schema.md §6
"""
import json
from datetime import date, datetime
from decimal import Decimal

import httpx
from app.config import settings


def _json_default(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


async def upload_blob(data: dict) -> str:
    """Upload JSON data to Walrus, return blob_id."""
    payload = json.dumps(data, default=_json_default).encode()
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.walrus_publisher_url}/v1/store",
            content=payload,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
        )
        resp.raise_for_status()
        result = resp.json()
        return result["newlyCreated"]["blobObject"]["blobId"]


async def download_blob(blob_id: str) -> dict:
    """Download and parse JSON blob from Walrus."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.walrus_aggregator_url}/v1/{blob_id}",
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

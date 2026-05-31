"""GET /market/pools — MVP catalog (+ optional monitor health via BFF)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.common import success
from app.services.pool_catalog import POOL_CATALOG

router = APIRouter()


@router.get("/pools")
async def list_market_pools():
    return JSONResponse(content=success({"pools": POOL_CATALOG}))

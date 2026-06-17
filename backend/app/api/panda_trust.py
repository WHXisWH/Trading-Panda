"""Trust layer read APIs — Merkle roots and skill digest status (Epic 9)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _load_owned_panda
from app.db.database import get_db
from app.db.models import User
from app.schemas.common import error, success
from app.schemas.errors import ApiError
from app.services.merkle_service import get_latest_merkle_root, list_merkle_roots
from app.services.skill_memory_service import get_latest_skill_version

router = APIRouter()


@router.get("/{panda_id}/trust/merkle")
async def latest_merkle_status(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        latest = await get_latest_merkle_root(db, panda_id)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))
    return JSONResponse(content=success(latest))


@router.get("/{panda_id}/trust/merkle/history")
async def merkle_history(
    panda_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        rows = await list_merkle_roots(db, panda_id, limit=limit)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))
    return JSONResponse(content=success(rows))


@router.get("/{panda_id}/trust/skill-digest")
async def latest_skill_digest_status(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        latest = await get_latest_skill_version(db, panda_id)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))
    return JSONResponse(content=success(latest))

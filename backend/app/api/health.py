from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def engine_health():
    return {"status": "ok", "actors": 0}

from fastapi import APIRouter
from app.api import health, actor, auth, strategy, market
from app.api import pandas_api, panda_mint, panda_read

api_router = APIRouter()
api_router.include_router(health.router, prefix="/engine", tags=["health"])
api_router.include_router(market.router, prefix="/engine", tags=["market"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(panda_mint.router, prefix="/panda", tags=["panda"])
api_router.include_router(panda_read.router, prefix="/panda", tags=["panda"])
api_router.include_router(pandas_api.router, prefix="/pandas", tags=["pandas"])
api_router.include_router(actor.router, prefix="/engine/actors", tags=["actors"])
api_router.include_router(strategy.router, prefix="/engine/strategy", tags=["strategy"])

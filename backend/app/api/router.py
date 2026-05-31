from fastapi import APIRouter
from app.api import health, actor, auth, strategy, market
from app.api import (
    market_pools,
    pandas_api,
    panda_mint,
    panda_pools,
    panda_read,
    panda_simulation,
    panda_strategy,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/engine", tags=["health"])
api_router.include_router(market.router, prefix="/engine", tags=["market"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(panda_mint.router, prefix="/panda", tags=["panda"])
api_router.include_router(panda_read.router, prefix="/panda", tags=["panda"])
api_router.include_router(panda_strategy.router, prefix="/panda", tags=["panda-strategy"])
api_router.include_router(panda_simulation.router, prefix="/panda", tags=["panda-simulation"])
api_router.include_router(panda_pools.router, prefix="/panda", tags=["panda-pools"])
api_router.include_router(market_pools.router, prefix="/market", tags=["market"])
api_router.include_router(pandas_api.router, prefix="/pandas", tags=["pandas"])
api_router.include_router(actor.router, prefix="/engine/actors", tags=["actors"])
api_router.include_router(strategy.router, prefix="/engine/strategy", tags=["strategy"])

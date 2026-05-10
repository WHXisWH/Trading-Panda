from fastapi import APIRouter
from app.api import health, actor, auth, strategy
from app.api import pandas_api

api_router = APIRouter()
api_router.include_router(health.router, prefix="/engine", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(pandas_api.router, prefix="/pandas", tags=["pandas"])
api_router.include_router(actor.router, prefix="/engine/actors", tags=["actors"])
api_router.include_router(strategy.router, prefix="/engine/strategy", tags=["strategy"])

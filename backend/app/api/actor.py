"""Actor management endpoints — start/stop/status for PandaActors."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engine.actor_manager import actor_manager

router = APIRouter()


class StartRequest(BaseModel):
    panda_id: str
    simulation_id: str
    speed: str = "1x"  # 1x | 10x | 100x | instant


@router.post("/{panda_id}/start")
async def start_actor(panda_id: str, body: StartRequest):
    await actor_manager.start(panda_id, body.simulation_id, body.speed)
    return {"status": "started", "panda_id": panda_id}


@router.post("/{panda_id}/stop")
async def stop_actor(panda_id: str):
    await actor_manager.stop(panda_id)
    return {"status": "stopped", "panda_id": panda_id}


@router.get("/{panda_id}/state")
async def get_actor_state(panda_id: str):
    state = await actor_manager.get_state(panda_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Actor not found")
    return state

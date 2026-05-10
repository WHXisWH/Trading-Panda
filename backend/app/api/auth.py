"""Auth endpoints — wallet login issues a JWT."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt

from app.config import settings
from app.db.database import get_db
from app.db.models import User

router = APIRouter()


class WalletLoginRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str  # base64; MVP: skip on-chain verification


class AuthResponse(BaseModel):
    jwt: str
    user_id: str
    wallet_address: str
    is_new_user: bool


def _issue_jwt(user_id: str, wallet: str) -> str:
    payload = {
        "sub": user_id,
        "wallet": wallet,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@router.post("/login", response_model=AuthResponse)
async def wallet_login(body: WalletLoginRequest, db: AsyncSession = Depends(get_db)):
    # MVP: trust wallet_address; TODO: verify signature via pysui
    result = await db.execute(select(User).where(User.wallet_address == body.wallet_address))
    user = result.scalar_one_or_none()
    is_new = user is None

    if is_new:
        user = User(wallet_address=body.wallet_address)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = _issue_jwt(user.id, user.wallet_address)
    return AuthResponse(jwt=token, user_id=user.id, wallet_address=user.wallet_address, is_new_user=is_new)


@router.get("/me")
async def get_me(authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    try:
        _, token = authorization.split(" ", 1)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(401, "Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(404, "User not found")
    return {
        "id": user.id,
        "wallet_address": user.wallet_address,
        "display_name": user.display_name,
        "experience_level": user.experience_level,
        "onboarding_survey": user.onboarding_survey,
        "created_at": user.created_at,
    }

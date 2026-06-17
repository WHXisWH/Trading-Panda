"""Auth endpoints — connect, refresh, me, nonce (api-spec §3.1)."""

from __future__ import annotations

from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.db.database import get_db
from app.db.models import Panda, User
from app.schemas.auth import (
    AuthConnectData,
    AuthConnectRequest,
    AuthMeData,
    AuthNonceData,
    AuthRefreshData,
    AuthRefreshRequest,
    AuthUserData,
    WalletLoginRequest,
)
from app.schemas.onboarding import OnboardingSurveyRequest
from app.services.onboarding_survey import build_survey_response, survey_to_json
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.auth_tokens import (
    decode_access_token,
    decode_refresh_token,
    issue_access_token,
    issue_refresh_token,
)
from app.services.bff_auth import is_bff_wallet_signature_verified
from app.services.db_errors import rethrow_db_error
from app.services.nonce_store import NONCE_MESSAGE_TEMPLATE, consume_nonce, issue_nonce
from app.services.wallet_verify import normalize_sui_address, verify_wallet_personal_message
from app.services.zklogin_verify import verify_google_id_token

router = APIRouter()

_GOOGLE_CLIENT_ID = getattr(settings, "google_client_id", "") or ""


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(timezone.utc).isoformat()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()


def _user_id_str(user: User) -> str:
    """ORM may return uuid.UUID for UUID columns — API/JWT require str."""
    return str(user.id)


def _user_payload(user: User) -> AuthUserData:
    return AuthUserData(
        id=_user_id_str(user),
        wallet_address=user.wallet_address,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        created_at=_iso(user.created_at),
    )


def _tokens_for_user(user: User, auth_method: str) -> AuthConnectData:
    user_id = _user_id_str(user)
    access, expires_in = issue_access_token(user_id, user.wallet_address, auth_method)  # type: ignore[arg-type]
    refresh = issue_refresh_token(user_id, user.wallet_address)
    return AuthConnectData(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
        user=_user_payload(user),
    )


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details, invalid_rules=exc.invalid_rules),
    )


@router.get("/nonce")
async def auth_nonce(wallet_address: str | None = Query(default=None)):
    try:
        normalized = normalize_sui_address(wallet_address) if wallet_address else None
        issued = await issue_nonce(normalized)
        data = AuthNonceData(
            nonce=issued.nonce,
            message=issued.message,
            expires_in=issued.expires_in,
        )
        return JSONResponse(content=success(data.model_dump()))
    except ApiError as exc:
        return _api_error_response(exc)


@router.post("/connect")
async def auth_connect(
    body: AuthConnectRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        if body.method == "wallet":
            return await _connect_wallet(body, db, request)
        return await _connect_zklogin(body, db)
    except ApiError as exc:
        return _api_error_response(exc)
    except Exception as exc:
        try:
            rethrow_db_error(exc)
        except ApiError as mapped:
            return _api_error_response(mapped)
        raise


async def _connect_wallet(
    body: AuthConnectRequest,
    db: AsyncSession,
    request: Request | None = None,
) -> JSONResponse:
    wallet = normalize_sui_address(body.wallet_address or "")
    if not body.signature or not body.nonce:
        raise ApiError(ApiErrorCode.AUTH_MISSING_PARAMS, "signature and nonce are required")

    await consume_nonce(body.nonce, wallet)
    message = NONCE_MESSAGE_TEMPLATE.format(nonce=body.nonce.strip())

    bff_verified = False
    if request is not None:
        bff_verified = is_bff_wallet_signature_verified(
            internal_key=request.headers.get("x-internal-key"),
            bff_wallet_verified=request.headers.get("x-bff-wallet-verified"),
            wallet_address=wallet,
        )

    if not bff_verified:
        verify_wallet_personal_message(
            message=message,
            signature_b64=body.signature,
            wallet_address=wallet,
        )

    result = await db.execute(select(User).where(User.wallet_address == wallet))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(wallet_address=wallet)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return JSONResponse(content=success(_tokens_for_user(user, "wallet").model_dump()))


async def _connect_zklogin(body: AuthConnectRequest, db: AsyncSession) -> JSONResponse:
    if body.provider != "google":
        raise ApiError(ApiErrorCode.AUTH_PROVIDER_NOT_SUPPORTED, "Only google is supported")

    claims = await verify_google_id_token(body.id_token or "", client_id=_GOOGLE_CLIENT_ID or None)
    subject = str(claims["sub"])
    wallet = normalize_sui_address(body.wallet_address or "")

    result = await db.execute(select(User).where(User.zk_login_subject == subject))
    user = result.scalar_one_or_none()
    if user is None:
        by_wallet = await db.execute(select(User).where(User.wallet_address == wallet))
        user = by_wallet.scalar_one_or_none()
        if user is None:
            user = User(wallet_address=wallet, zk_login_subject=subject)
            db.add(user)
        else:
            user.zk_login_subject = subject
        await db.commit()
        await db.refresh(user)
    elif normalize_sui_address(user.wallet_address) != wallet:
        user.wallet_address = wallet
        await db.commit()
        await db.refresh(user)

    return JSONResponse(content=success(_tokens_for_user(user, "zklogin").model_dump()))


@router.post("/refresh")
async def auth_refresh(body: AuthRefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_refresh_token(body.refresh_token)
    except jwt.PyJWTError:
        return JSONResponse(
            status_code=401,
            content=error(ApiErrorCode.AUTH_REFRESH_INVALID.value, "Invalid refresh token"),
        )

    user_id = payload.get("sub")
    if not user_id:
        return JSONResponse(
            status_code=401,
            content=error(ApiErrorCode.AUTH_REFRESH_INVALID.value, "Invalid refresh token"),
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return JSONResponse(
            status_code=404,
            content=error(ApiErrorCode.AUTH_USER_NOT_FOUND.value, "User not found"),
        )

    auth_method = "zklogin" if user.zk_login_subject else "wallet"
    user_id = _user_id_str(user)
    access, expires_in = issue_access_token(user_id, user.wallet_address, auth_method)  # type: ignore[arg-type]
    refresh = issue_refresh_token(user_id, user.wallet_address)
    data = AuthRefreshData(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
    )
    return JSONResponse(content=success(data.model_dump()))


@router.post("/onboarding-survey")
async def submit_onboarding_survey(
    body: OnboardingSurveyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.onboarding_survey is not None:
        return JSONResponse(
            status_code=409,
            content=error(
                ApiErrorCode.SURVEY_ALREADY_SUBMITTED.value,
                "Onboarding survey already submitted",
            ),
        )

    data = build_survey_response(body)
    user.onboarding_survey = survey_to_json(body)
    user.experience_level = data.experience_level
    await db.commit()
    await db.refresh(user)
    return JSONResponse(content=success(data.model_dump()))


@router.get("/me")
async def auth_me(authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    try:
        _, token = authorization.split(" ", 1)
        payload = decode_access_token(token)
        user_id = payload["sub"]
    except Exception:
        return JSONResponse(
            status_code=401,
            content=error(ApiErrorCode.AUTH_UNAUTHORIZED.value, "Invalid or expired token"),
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return JSONResponse(
            status_code=404,
            content=error(ApiErrorCode.AUTH_USER_NOT_FOUND.value, "User not found"),
        )

    count_result = await db.execute(
        select(func.count()).select_from(Panda).where(Panda.owner_id == user.id)
    )
    panda_count = int(count_result.scalar() or 0)
    auth_method = payload.get("auth_method") or ("zklogin" if user.zk_login_subject else "wallet")

    data = AuthMeData(
        id=_user_id_str(user),
        wallet_address=user.wallet_address,
        zk_login_subject=user.zk_login_subject,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        auth_method=auth_method,  # type: ignore[arg-type]
        panda_count=panda_count,
        onboarding_survey=user.onboarding_survey,
        experience_level=user.experience_level,
        created_at=_iso(user.created_at),
        updated_at=_iso(user.updated_at),
    )
    return JSONResponse(content=success(data.model_dump()))


@router.post("/login")
async def wallet_login_legacy(body: WalletLoginRequest, db: AsyncSession = Depends(get_db)):
    """Legacy wallet login — requires server nonce via /auth/nonce first."""
    req = AuthConnectRequest(
        method="wallet",
        wallet_address=body.wallet_address,
        signature=body.signature,
        nonce=body.message,
    )
    from starlette.requests import Request as StarletteRequest

    scope = {"type": "http", "headers": [], "method": "POST", "path": "/auth/login"}
    res = await auth_connect(req, StarletteRequest(scope), db)
    if res.status_code != 200:
        return res
    import json

    raw = res.body
    parsed = json.loads(raw.decode() if isinstance(raw, bytes) else raw)
    data = parsed.get("data", {})
    legacy = {
        "jwt": data.get("access_token"),
        "user_id": data.get("user", {}).get("id"),
        "wallet_address": data.get("user", {}).get("wallet_address"),
        "is_new_user": False,
    }
    return JSONResponse(content=legacy)

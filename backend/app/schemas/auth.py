"""Auth request/response models — aligned with docs/api-specification.md §3.1."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AuthConnectRequest(BaseModel):
    method: Literal["wallet", "zklogin"]
    wallet_address: str | None = None
    signature: str | None = None
    nonce: str | None = None
    public_key: str | None = None
    id_token: str | None = None
    provider: Literal["google", "apple"] | None = None
    salt: str | None = None

    @model_validator(mode="after")
    def check_method_fields(self) -> AuthConnectRequest:
        if self.method == "wallet":
            if not self.wallet_address or not self.signature or not self.nonce:
                raise ValueError("wallet method requires wallet_address, signature, nonce")
        elif self.method == "zklogin":
            if not self.id_token or not self.provider or not self.wallet_address:
                raise ValueError("zklogin method requires id_token, provider, wallet_address")
            if self.provider != "google":
                raise ValueError("only google provider supported in MVP")
        return self


class AuthUserData(BaseModel):
    id: str
    wallet_address: str
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: str


class AuthConnectData(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: AuthUserData


class AuthRefreshRequest(BaseModel):
    refresh_token: str


class AuthRefreshData(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class AuthMeData(BaseModel):
    id: str
    wallet_address: str
    zk_login_subject: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    auth_method: Literal["wallet", "zklogin"]
    panda_count: int = 0
    onboarding_survey: dict | None = None
    experience_level: str | None = None
    created_at: str
    updated_at: str


class AuthNonceData(BaseModel):
    nonce: str
    message: str
    expires_in: int


class WalletLoginRequest(BaseModel):
    """Legacy body for POST /auth/login (Sprint 0.2 compat)."""

    wallet_address: str
    message: str = Field(min_length=1)
    signature: str = Field(min_length=1)

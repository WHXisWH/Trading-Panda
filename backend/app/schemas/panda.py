"""Panda mint API models — aligned with docs/api-specification.md §3.2."""

from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.errors import ApiError, ApiErrorCode

_NAME_RE = re.compile(r"^[\w\u4e00-\u9fff\-]{1,20}$", re.UNICODE)


class PandaPersonalityData(BaseModel):
    boldness: int = Field(ge=0, le=100)
    patience: int = Field(ge=0, le=100)
    intuition: int = Field(ge=0, le=100)
    focus: int = Field(ge=0, le=100)
    contrarian: int = Field(ge=0, le=100)


class PandaTalentData(BaseModel):
    id: int = Field(ge=0, le=6)
    name: str
    description: str


class PandaMintRequest(BaseModel):
    """Register an on-chain mint: client signs tx, then posts digest + object id."""

    sui_object_id: str = Field(min_length=3)
    sui_tx_digest: str = Field(min_length=3)
    name: str | None = Field(default=None, max_length=20)

    @field_validator("sui_object_id", "sui_tx_digest")
    @classmethod
    def strip_fields(cls, v: str) -> str:
        return v.strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        name = v.strip()
        if not name:
            return None
        if not _NAME_RE.match(name):
            raise ValueError("name must be 1-20 alphanumeric/CJK characters")
        return name

    def validate_name_or_raise(self) -> None:
        if self.name is None:
            return
        if not _NAME_RE.match(self.name):
            raise ApiError(
                ApiErrorCode.PANDA_NAME_INVALID,
                "Name must be 1-20 characters (letters, numbers, CJK, hyphen)",
            )


class PandaMintData(BaseModel):
    id: str
    sui_object_id: str
    sui_tx_digest: str
    name: str | None
    personality: PandaPersonalityData
    talent: PandaTalentData
    generation: int
    created_at: str

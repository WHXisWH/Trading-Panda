"""Mint registration decision helpers — Epic 1.2 idempotent sync."""

from __future__ import annotations

from enum import Enum


class ExistingMintDecision(str, Enum):
    CREATE = "create"
    RETURN_EXISTING = "return_existing"
    CONFLICT = "conflict"


def decide_existing_mint(
    existing_owner_id: str | None,
    requester_id: str,
) -> ExistingMintDecision:
    if existing_owner_id is None:
        return ExistingMintDecision.CREATE
    if existing_owner_id != requester_id:
        return ExistingMintDecision.CONFLICT
    return ExistingMintDecision.RETURN_EXISTING

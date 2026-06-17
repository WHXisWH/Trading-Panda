"""Mint registration idempotency — Epic 1.3."""

from app.services.mint_registration import ExistingMintDecision, decide_existing_mint


def test_decide_existing_mint_create_when_absent():
    assert decide_existing_mint(None, "user-a") == ExistingMintDecision.CREATE


def test_decide_existing_mint_return_same_owner():
    assert (
        decide_existing_mint("user-a", "user-a")
        == ExistingMintDecision.RETURN_EXISTING
    )


def test_decide_existing_mint_conflict_different_owner():
    assert (
        decide_existing_mint("user-a", "user-b")
        == ExistingMintDecision.CONFLICT
    )

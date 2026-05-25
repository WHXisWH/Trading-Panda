"""BFF wallet verification trust header."""

from app.services.bff_auth import is_bff_wallet_signature_verified
from app.services.wallet_verify import normalize_sui_address


def test_bff_wallet_verified_ok(monkeypatch):
    monkeypatch.setattr(
        "app.services.bff_auth.settings.internal_secret",
        "test-secret",
    )
    wallet = "0x" + "a" * 64
    assert is_bff_wallet_signature_verified(
        internal_key="test-secret",
        bff_wallet_verified=wallet,
        wallet_address=wallet,
    )


def test_bff_wallet_verified_rejects_bad_secret(monkeypatch):
    monkeypatch.setattr(
        "app.services.bff_auth.settings.internal_secret",
        "test-secret",
    )
    wallet = normalize_sui_address("0x" + "b" * 40)
    assert not is_bff_wallet_signature_verified(
        internal_key="wrong",
        bff_wallet_verified=wallet,
        wallet_address=wallet,
    )

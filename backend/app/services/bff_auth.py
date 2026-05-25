"""Trust signals from Next.js BFF after server-side wallet signature verify."""

from __future__ import annotations

from app.config import settings
from app.services.wallet_verify import normalize_sui_address

_BFF_WALLET_HEADER = "x-bff-wallet-verified"
_INTERNAL_KEY_HEADER = "x-internal-key"


def is_bff_wallet_signature_verified(
    *,
    internal_key: str | None,
    bff_wallet_verified: str | None,
    wallet_address: str,
) -> bool:
    if not internal_key or not bff_wallet_verified:
        return False
    if internal_key != settings.internal_secret:
        return False
    try:
        expected = normalize_sui_address(wallet_address)
        verified = normalize_sui_address(bff_wallet_verified)
    except Exception:
        return False
    return expected == verified

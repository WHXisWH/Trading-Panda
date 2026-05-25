"""Sui PersonalMessage signature verification (Ed25519, no pysui required)."""

from __future__ import annotations

import base64
import hashlib
import re

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from app.schemas.errors import ApiError, ApiErrorCode

_SUI_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{1,64}$")
_ED25519_SCHEME_FLAG = 0
_ZKLOGIN_SCHEME_FLAG = 5


def _uleb128_encode(n: int) -> bytes:
    if n < 0:
        raise ValueError("uleb128 expects non-negative integer")
    out = bytearray()
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            byte |= 0x80
        out.append(byte)
        if not n:
            break
    return bytes(out)


def _bcs_byte_vector(data: bytes) -> bytes:
    return _uleb128_encode(len(data)) + data


def _personal_message_digest(message_utf8: bytes) -> bytes:
    """Match @mysten/sui verifyPersonalMessage (byteVector + IntentMessage)."""
    inner = _bcs_byte_vector(message_utf8)
    # IntentScope.PersonalMessage=3, IntentVersion.V0=0, AppId.Sui=0
    intent = _uleb128_encode(3) + _uleb128_encode(0) + _uleb128_encode(0)
    intent_message = intent + inner
    return hashlib.blake2b(intent_message, digest_size=32).digest()


def normalize_sui_address(address: str) -> str:
    raw = address.strip().lower()
    if not raw.startswith("0x"):
        raw = f"0x{raw}"
    if not _SUI_ADDRESS_RE.match(raw):
        raise ApiError(ApiErrorCode.VALIDATION_ERROR, "Invalid Sui wallet address format")
    body = raw[2:]
    return "0x" + body.zfill(64)


def sui_address_from_pubkey(scheme_flag: int, pubkey: bytes) -> str:
    if len(pubkey) != 32:
        raise ApiError(ApiErrorCode.AUTH_INVALID_SIGNATURE, "Invalid public key length")
    hashed = hashlib.blake2b(bytes([scheme_flag]) + pubkey, digest_size=32).digest()
    return "0x" + hashed.hex()


def verify_wallet_personal_message(
    *,
    message: str,
    signature_b64: str,
    wallet_address: str,
) -> None:
    """Verify signature; raise ApiError on failure."""
    if not message or not signature_b64:
        raise ApiError(ApiErrorCode.AUTH_MISSING_PARAMS, "message and signature are required")

    expected = normalize_sui_address(wallet_address)
    message_bytes = message.encode("utf-8")
    digest = _personal_message_digest(message_bytes)

    try:
        raw = base64.b64decode(signature_b64, validate=True)
    except Exception as exc:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_SIGNATURE,
            "Signature must be base64-encoded",
        ) from exc

    if len(raw) < 1 + 64 + 32:
        raise ApiError(ApiErrorCode.AUTH_INVALID_SIGNATURE, "Signature payload too short")

    scheme = raw[0]
    if scheme == _ZKLOGIN_SCHEME_FLAG:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_SIGNATURE,
            "ZkLogin wallet signature must be verified via the app API (BFF)",
        )
    if scheme != _ED25519_SCHEME_FLAG:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_SIGNATURE,
            f"Unsupported signature scheme flag: {scheme}",
        )

    sig_bytes = raw[1:65]
    pub_bytes = raw[65:97]

    try:
        VerifyKey(pub_bytes).verify(digest, sig_bytes)
    except BadSignatureError as exc:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_SIGNATURE,
            "Wallet signature does not match message",
        ) from exc

    derived = sui_address_from_pubkey(scheme, pub_bytes)
    if derived != expected:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_SIGNATURE,
            "Signature does not match wallet_address",
        )

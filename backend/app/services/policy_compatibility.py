"""Strategy ↔ TradingPolicy compatibility — Epic 4."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Panda, TradingPolicy
from app.schemas.strategy import ParsedStrategyLayers, PolicyConflictDetail
from app.services.market_pairs import canonical_market_pair, configured_launch_pairs, resolve_launch_pairs


DEFAULT_INITIAL_CAPITAL = 10_000.0


@dataclass(frozen=True)
class PolicyMirror:
    version: int
    allowed_pairs: list[str]
    max_notional_per_trade: float
    max_daily_loss: float
    paused: bool = False
    agent_revoked: bool = False
    mirror_synced: bool = True


@dataclass(frozen=True)
class PolicyCompatibilityResult:
    compatible: bool
    conflicts: list[PolicyConflictDetail]
    allowed_pairs: list[str]
    blocked_pairs: list[str]
    target_pairs: list[str]
    policy_version: int | None
    policy_paused: bool = False
    summary: str | None = None


def _normalize_pair(pair: str) -> str:
    return canonical_market_pair(pair).upper()


def _launch_pair_defaults() -> list[str]:
    return [_normalize_pair(p) for p in configured_launch_pairs()]


def resolve_target_pairs(
    parsed: ParsedStrategyLayers,
    *,
    fallback_pairs: list[str] | None = None,
) -> list[str]:
    if parsed.target_pairs:
        return [_normalize_pair(p) for p in parsed.target_pairs]
    if fallback_pairs:
        return [_normalize_pair(p) for p in fallback_pairs]
    return _launch_pair_defaults()


def policy_mirror_from_row(row: TradingPolicy, *, mirror_synced: bool = True) -> PolicyMirror:
    allowed = [_normalize_pair(p) for p in (row.allowed_pairs or [])]
    return PolicyMirror(
        version=int(row.version),
        allowed_pairs=allowed,
        max_notional_per_trade=float(row.max_notional_per_trade),
        max_daily_loss=float(row.max_daily_loss),
        paused=bool(row.paused),
        agent_revoked=not bool(row.authorized_agent),
        mirror_synced=mirror_synced,
    )


async def load_active_trading_policy(
    db: AsyncSession,
    panda_id: str,
) -> PolicyMirror | None:
    result = await db.execute(
        select(TradingPolicy)
        .where(TradingPolicy.panda_id == panda_id, TradingPolicy.paused.is_(False))
        .order_by(TradingPolicy.version.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return policy_mirror_from_row(row)


async def load_panda_fallback_pairs(db: AsyncSession, panda_id: str) -> list[str]:
    result = await db.execute(select(Panda.subscribed_pools).where(Panda.id == panda_id))
    pools = result.scalar_one_or_none()
    if isinstance(pools, list) and pools:
        return [_normalize_pair(str(p)) for p in pools]
    return [_normalize_pair(pair) for pair in await resolve_launch_pairs()]


def check_policy_compatibility(
    parsed: ParsedStrategyLayers,
    policy: PolicyMirror | None,
    *,
    target_pairs: list[str],
    initial_capital: float = DEFAULT_INITIAL_CAPITAL,
) -> PolicyCompatibilityResult:
    if policy is None:
        return PolicyCompatibilityResult(
            compatible=True,
            conflicts=[],
            allowed_pairs=[],
            blocked_pairs=[],
            target_pairs=target_pairs,
            policy_version=None,
            summary="No active TradingPolicy mirror — strategy guides decisions only after Agent Wallet setup.",
        )

    allowed_set = set(policy.allowed_pairs)
    blocked = [p for p in target_pairs if p not in allowed_set]
    conflicts: list[PolicyConflictDetail] = []

    for pair in blocked:
        conflicts.append(
            PolicyConflictDetail(
                field="target_pairs",
                code="POLICY_PAIR_NOT_ALLOWED",
                message=f"Pair {pair} is not allowed by TradingPolicy v{policy.version}.",
                value=pair,
            )
        )

    position_pct = parsed.position_sizing.value or parsed.position_sizing.max_position_pct
    if position_pct is not None:
        assumed_notional = float(initial_capital) * float(position_pct)
        if assumed_notional > policy.max_notional_per_trade:
            conflicts.append(
                PolicyConflictDetail(
                    field="position_sizing.value",
                    code="POLICY_NOTIONAL_EXCEEDED",
                    message=(
                        f"Assumed trade size {assumed_notional:.2f} exceeds policy max "
                        f"{policy.max_notional_per_trade:.2f} per trade."
                    ),
                    value=round(assumed_notional, 2),
                )
            )

    if policy.paused:
        conflicts.append(
            PolicyConflictDetail(
                field="policy",
                code="POLICY_PAUSED",
                message="TradingPolicy is paused — strategy cannot activate until policy resumes.",
            )
        )

    compatible = len(conflicts) == 0
    summary = _build_summary(policy, target_pairs, blocked, compatible)
    return PolicyCompatibilityResult(
        compatible=compatible,
        conflicts=conflicts,
        allowed_pairs=policy.allowed_pairs,
        blocked_pairs=blocked,
        target_pairs=target_pairs,
        policy_version=policy.version,
        policy_paused=policy.paused,
        summary=summary,
    )


def _build_summary(
    policy: PolicyMirror,
    target_pairs: list[str],
    blocked: list[str],
    compatible: bool,
) -> str:
    if not compatible:
        if blocked:
            return (
                f"TradingPolicy v{policy.version} blocks {len(blocked)} pair(s). "
                "Adjust target pairs or tighten policy in Agent Wallet."
            )
        return f"TradingPolicy v{policy.version} has {len(blocked)} risk conflict(s)."
    if not target_pairs:
        return f"Compatible with TradingPolicy v{policy.version}."
    return (
        f"Compatible with TradingPolicy v{policy.version} for "
        f"{', '.join(target_pairs)}."
    )


def compatibility_to_dict(result: PolicyCompatibilityResult) -> dict[str, Any]:
    return {
        "policy_compatible": result.compatible,
        "policy_version": result.policy_version,
        "policy_paused": result.policy_paused,
        "policy_summary": result.summary,
        "allowed_pairs": result.allowed_pairs,
        "blocked_pairs": result.blocked_pairs,
        "target_pairs": result.target_pairs,
        "policy_conflicts": [c.model_dump() for c in result.conflicts],
    }

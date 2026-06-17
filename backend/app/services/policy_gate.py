"""Runtime PolicyGate — per-tick executable intent checks (Epic 5 / 8)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.policy_compatibility import PolicyMirror, _normalize_pair


@dataclass(frozen=True)
class PolicyGateResult:
    passed: bool
    rejection_code: str | None = None
    rejection_reason: str | None = None
    policy_snapshot: dict[str, Any] | None = None


def policy_snapshot_from_mirror(policy: PolicyMirror) -> dict[str, Any]:
    return {
        "version": policy.version,
        "allowed_pairs": list(policy.allowed_pairs),
        "max_notional_per_trade": policy.max_notional_per_trade,
        "max_daily_loss": policy.max_daily_loss,
        "paused": policy.paused,
        "agent_revoked": policy.agent_revoked,
        "mirror_synced": policy.mirror_synced,
    }


class PolicyGate:
    """Evaluate whether an executable OrderIntent may mutate the Training Ledger."""

    def evaluate(
        self,
        policy: PolicyMirror | None,
        *,
        pair: str,
        side: str,
        notional: float,
        daily_realized_loss: float = 0.0,
    ) -> PolicyGateResult:
        if side == "HOLD":
            return PolicyGateResult(passed=True, policy_snapshot=None)

        if policy is None:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_NOT_FOUND",
                rejection_reason="No active TradingPolicy mirror — Agent Wallet setup required.",
            )

        snapshot = policy_snapshot_from_mirror(policy)

        if not policy.mirror_synced:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_MIRROR_STALE",
                rejection_reason="Policy mirror is stale — execution blocked until sync completes.",
                policy_snapshot=snapshot,
            )

        if policy.agent_revoked:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_AGENT_REVOKED",
                rejection_reason="Authorized agent was revoked — paper execution blocked.",
                policy_snapshot=snapshot,
            )

        if policy.paused:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_PAUSED",
                rejection_reason="TradingPolicy is paused — paper execution blocked.",
                policy_snapshot=snapshot,
            )

        normalized_pair = _normalize_pair(pair)
        if normalized_pair not in set(policy.allowed_pairs):
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_PAIR_NOT_ALLOWED",
                rejection_reason=f"Pair {normalized_pair} is not allowed by TradingPolicy v{policy.version}.",
                policy_snapshot=snapshot,
            )

        if notional > policy.max_notional_per_trade:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_NOTIONAL_EXCEEDED",
                rejection_reason=(
                    f"Notional {notional:.2f} exceeds policy max "
                    f"{policy.max_notional_per_trade:.2f} per trade."
                ),
                policy_snapshot=snapshot,
            )

        if daily_realized_loss >= policy.max_daily_loss:
            return PolicyGateResult(
                passed=False,
                rejection_code="POLICY_DAILY_LOSS_EXCEEDED",
                rejection_reason=(
                    f"Daily realized loss {daily_realized_loss:.2f} reached policy limit "
                    f"{policy.max_daily_loss:.2f}."
                ),
                policy_snapshot=snapshot,
            )

        return PolicyGateResult(passed=True, policy_snapshot=snapshot)

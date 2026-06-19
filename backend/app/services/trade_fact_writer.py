"""Atomic OrderIntent → Ledger → TradeFact commit (Epic 5)."""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import OrderIntent, OutboxEvent, Trade, TradeFact
from app.engine.decision_pipeline import DecisionResult
from app.engine.event_publisher import EventPublisher
from app.engine.market_event import MarketEvent
from app.services.ledger_service import LedgerService
from app.services.policy_compatibility import PolicyMirror
from app.services.policy_gate import PolicyGate, PolicyGateResult
from app.services.post_commit_hooks import after_trade_fact_committed
from app.services.trade_fact_close import apply_close_fields, enrich_sell_outcome


def _hash_payload(parts: dict[str, Any]) -> str:
    canonical = json.dumps(parts, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def build_decision_hash(
    *,
    panda_id: str,
    pair: str,
    side: str,
    timestamp: float,
    final_score: float,
) -> str:
    return _hash_payload(
        {
            "panda_id": panda_id,
            "pair": pair,
            "side": side,
            "timestamp": timestamp,
            "final_score": round(final_score, 6),
        }
    )


@dataclass(frozen=True)
class IntentCommitResult:
    order_intent_id: str
    trade_fact_id: str | None
    status: str
    rejection_reason: str | None
    decision_hash: str
    executed: bool
    order_intent_payload: dict[str, Any]
    trade_fact_payload: dict[str, Any] | None


class TradeFactWriter:
    """Persist intents (including rejects) and commit paper executions atomically."""

    def __init__(
        self,
        ledger: LedgerService | None = None,
        policy_gate: PolicyGate | None = None,
    ) -> None:
        self._ledger = ledger or LedgerService()
        self._gate = policy_gate or PolicyGate()

    async def commit_tick(
        self,
        session: AsyncSession,
        *,
        panda_id: str,
        vault_id: str | None,
        policy_id: str | None,
        policy: PolicyMirror | None,
        simulation_id: str,
        strategy_id: str | None,
        event: MarketEvent,
        result: DecisionResult,
        emotion: str,
        strategy_version: int,
        skill_version: int,
        initial_capital: float,
        position_pct: float,
        stop_loss: float,
        publisher: EventPublisher | None = None,
    ) -> IntentCommitResult:
        pair = event.pair or event.asset
        side = "HOLD" if result.zone != "EXECUTE" else result.action
        reference_price = float(event.reference_price or event.price)
        notional = 0.0
        if side in ("BUY", "SELL"):
            account = await self._ledger.get_or_create_account(
                session,
                panda_id=panda_id,
                vault_id=vault_id,
                initial_capital=initial_capital,
            )
            equity = float(account.equity) or initial_capital
            notional = min(equity * position_pct, float(account.cash_balance) if side == "BUY" else equity * position_pct)

        decision_hash = build_decision_hash(
            panda_id=panda_id,
            pair=pair,
            side=side,
            timestamp=event.timestamp,
            final_score=result.final_score,
        )

        market_snapshot = event.to_market_dict()
        decision_snapshot = {
            "action": result.action,
            "zone": result.zone,
            "final_score": round(result.final_score, 6),
            "steps": result.steps,
            "strategy_version": strategy_version,
            "skill_version": skill_version,
            "entry_threshold": round(result.entry_threshold, 4),
            "emotion": emotion,
        }

        policy_version = policy.version if policy else 0
        gate_result: PolicyGateResult | None = None
        status = "DECIDED"
        rejection_reason: str | None = None
        executed = False
        trade_fact: TradeFact | None = None
        mutation = None

        if side in ("BUY", "SELL"):
            daily_loss = await self._ledger.daily_realized_loss(session, panda_id)
            gate_result = self._gate.evaluate(
                policy,
                pair=pair,
                side=side,
                notional=notional,
                daily_realized_loss=daily_loss,
            )
            if not gate_result.passed:
                status = "REJECTED"
                rejection_reason = gate_result.rejection_reason

        policy_snapshot = (gate_result.policy_snapshot if gate_result else None) or (
            {"version": policy_version} if policy else {}
        )

        proof_eligible = (
            side in ("BUY", "SELL")
            and status == "DECIDED"
            and result.final_score >= 0.75
            and settings.chain_proof_enabled
        )

        intent = OrderIntent(
            id=str(uuid.uuid4()),
            panda_id=panda_id,
            vault_id=vault_id,
            policy_id=policy_id,
            policy_version=policy_version,
            mode="training_ledger",
            pair=pair,
            side=side,
            notional=Decimal(str(round(notional, 8))),
            reference_price=Decimal(str(reference_price)),
            final_score=Decimal(str(round(result.final_score, 6))),
            decision_hash=decision_hash,
            proof_eligible=proof_eligible,
            status=status,
            market_snapshot=market_snapshot,
            decision_snapshot=decision_snapshot,
            policy_snapshot=policy_snapshot,
            rejection_reason=rejection_reason,
        )
        session.add(intent)
        await session.flush()

        intent_payload = self._intent_dict(intent)

        if side in ("BUY", "SELL") and status == "DECIDED":
            account = await self._ledger.get_or_create_account(
                session,
                panda_id=panda_id,
                vault_id=vault_id,
                initial_capital=initial_capital,
            )
            try:
                mutation = await self._ledger.apply_execution(
                    session,
                    account=account,
                    panda_id=panda_id,
                    order_intent_id=intent.id,
                    pair=pair,
                    asset=event.asset,
                    side=side,
                    notional=notional,
                    reference_price=reference_price,
                )
            except ValueError as exc:
                intent.status = "REJECTED"
                intent.rejection_reason = str(exc)
                status = "REJECTED"
                rejection_reason = str(exc)
            else:
                intent.status = "EXECUTED"
                status = "EXECUTED"
                executed = True
                fact_hash = _hash_payload(
                    {
                        "order_intent_id": intent.id,
                        "decision_hash": decision_hash,
                        "pair": pair,
                        "side": side,
                    }
                )
                outcome = enrich_sell_outcome(
                    side=side,
                    realized_delta=mutation.realized_pnl_delta,
                    entry_price=mutation.avg_entry_price_before_sell,
                    exit_price=reference_price,
                    initial_capital=initial_capital,
                )
                trade_fact = TradeFact(
                    id=str(uuid.uuid4()),
                    panda_id=panda_id,
                    order_intent_id=intent.id,
                    pair=pair,
                    side=side,
                    mode="training_ledger",
                    market_snapshot=market_snapshot,
                    decision_snapshot=decision_snapshot,
                    policy_snapshot=policy_snapshot,
                    ledger_snapshot_before=mutation.ledger_before,
                    ledger_snapshot_after=mutation.ledger_after,
                    execution_snapshot={
                        "notional": notional,
                        "quantity": mutation.quantity,
                        "reference_price": reference_price,
                        "position_pct": position_pct,
                        "stop_loss": stop_loss,
                    },
                    outcome=outcome,
                    realized_pnl=Decimal(str(round(mutation.realized_pnl_delta, 8))),
                    skill_version_before=skill_version,
                    fact_hash=fact_hash,
                    proof_status="not_requested",
                )
                apply_close_fields(
                    trade_fact,
                    pair=pair,
                    ledger_after=mutation.ledger_after,
                    outcome=outcome,
                    realized_delta=mutation.realized_pnl_delta,
                    initial_capital=initial_capital,
                )
                session.add(trade_fact)
                await session.flush()
                for entry_id in mutation.entry_ids:
                    from app.db.models import LedgerEntry

                    entry = await session.get(LedgerEntry, entry_id)
                    if entry:
                        entry.trade_fact_id = trade_fact.id

                if strategy_id:
                    pnl_pct = mutation.realized_pnl_delta / max(initial_capital, 1.0)
                    session.add(
                        Trade(
                            panda_id=panda_id,
                            strategy_id=strategy_id,
                            simulation_id=simulation_id,
                            asset=event.asset[:5],
                            action=side,
                            price=Decimal(str(reference_price)),
                            quantity=Decimal(str(mutation.quantity)),
                            position_size_pct=Decimal(str(position_pct)),
                            final_score=Decimal(str(round(result.final_score, 4))),
                            emotion_at_trade=emotion,
                            proficiency_at_trade=0,
                            pnl_pct=Decimal(str(round(pnl_pct, 6))),
                            decision_details={
                                "steps": result.steps,
                                "zone": result.zone,
                                "order_intent_id": intent.id,
                                "trade_fact_id": trade_fact.id,
                            },
                        )
                    )

        outbox_events = self._build_outbox(panda_id, intent_payload, trade_fact)
        for evt in outbox_events:
            session.add(evt)

        if trade_fact is not None and executed:
            await after_trade_fact_committed(
                session,
                panda_id=panda_id,
                trade_fact=trade_fact,
            )

        await session.commit()

        trade_fact_payload = self._trade_fact_dict(trade_fact) if trade_fact else None

        if publisher:
            await publisher.publish_order_intent(panda_id, intent_payload)
            if gate_result and not gate_result.passed:
                await publisher.publish_policy_rejected(
                    panda_id,
                    {
                        "order_intent_id": intent.id,
                        "code": gate_result.rejection_code,
                        "reason": gate_result.rejection_reason,
                    },
                )
            if executed and trade_fact_payload:
                await publisher.publish_execution(panda_id, trade_fact_payload)

        return IntentCommitResult(
            order_intent_id=intent.id,
            trade_fact_id=trade_fact.id if trade_fact else None,
            status=status,
            rejection_reason=rejection_reason,
            decision_hash=decision_hash,
            executed=executed,
            order_intent_payload=intent_payload,
            trade_fact_payload=trade_fact_payload,
        )

    def _intent_dict(self, intent: OrderIntent) -> dict[str, Any]:
        return {
            "id": intent.id,
            "panda_id": intent.panda_id,
            "vault_id": intent.vault_id,
            "policy_id": intent.policy_id,
            "policy_version": intent.policy_version,
            "mode": intent.mode,
            "pair": intent.pair,
            "side": intent.side,
            "notional": float(intent.notional),
            "reference_price": float(intent.reference_price),
            "final_score": float(intent.final_score) if intent.final_score is not None else None,
            "decision_hash": intent.decision_hash,
            "proof_eligible": intent.proof_eligible,
            "status": intent.status,
            "rejection_reason": intent.rejection_reason,
            "created_at": intent.created_at.isoformat() if intent.created_at else None,
        }

    def _trade_fact_dict(self, fact: TradeFact) -> dict[str, Any]:
        return {
            "id": fact.id,
            "panda_id": fact.panda_id,
            "order_intent_id": fact.order_intent_id,
            "pair": fact.pair,
            "side": fact.side,
            "mode": fact.mode,
            "fact_hash": fact.fact_hash,
            "proof_status": fact.proof_status,
            "realized_pnl": float(fact.realized_pnl) if fact.realized_pnl is not None else None,
            "closed_at": fact.closed_at.isoformat() if fact.closed_at else None,
            "review_status": fact.review_status,
            "outcome": fact.outcome,
            "ledger_snapshot_after": fact.ledger_snapshot_after,
            "created_at": fact.created_at.isoformat() if fact.created_at else None,
        }

    def _build_outbox(
        self,
        panda_id: str,
        intent_payload: dict[str, Any],
        trade_fact: TradeFact | None,
    ) -> list[OutboxEvent]:
        events = [
            OutboxEvent(
                aggregate_type="order_intent",
                aggregate_id=uuid.UUID(intent_payload["id"]),
                event_type="order_intent.created",
                redis_channel=f"panda:{panda_id}:order_intent",
                payload=intent_payload,
            )
        ]
        if trade_fact:
            events.append(
                OutboxEvent(
                    aggregate_type="trade_fact",
                    aggregate_id=uuid.UUID(trade_fact.id),
                    event_type="execution.committed",
                    redis_channel=f"panda:{panda_id}:execution",
                    payload=self._trade_fact_dict(trade_fact),
                )
            )
        return events

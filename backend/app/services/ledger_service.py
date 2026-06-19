"""Training Ledger mutations — cash, positions, equity (Epic 5)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import LedgerEntry, PandaAccount, PandaPosition, TradeFact


def _d(value: float | Decimal) -> Decimal:
    return Decimal(str(value))


@dataclass(frozen=True)
class LedgerSnapshot:
    cash_balance: float
    debt_balance: float
    equity: float
    realized_pnl: float
    unrealized_pnl: float
    positions: list[dict[str, Any]]


@dataclass(frozen=True)
class LedgerMutationResult:
    ledger_before: dict[str, Any]
    ledger_after: dict[str, Any]
    entry_ids: list[str]
    realized_pnl_delta: float
    quantity: float
    avg_entry_price_before_sell: float | None = None


class LedgerService:
    """Mutate panda_accounts / panda_positions and append ledger_entries."""

    async def get_or_create_account(
        self,
        session: AsyncSession,
        *,
        panda_id: str,
        vault_id: str | None,
        initial_capital: float = 10_000.0,
    ) -> PandaAccount:
        result = await session.execute(
            select(PandaAccount).where(
                PandaAccount.panda_id == panda_id,
                PandaAccount.mode == "training_ledger",
            )
        )
        account = result.scalar_one_or_none()
        if account is not None:
            return account

        capital = _d(initial_capital)
        account = PandaAccount(
            panda_id=panda_id,
            vault_id=vault_id,
            mode="training_ledger",
            cash_balance=capital,
            equity=capital,
            status="active",
        )
        session.add(account)
        await session.flush()
        return account

    async def snapshot(
        self,
        session: AsyncSession,
        account: PandaAccount,
    ) -> LedgerSnapshot:
        pos_result = await session.execute(
            select(PandaPosition).where(PandaPosition.account_id == account.id)
        )
        positions = [
            {
                "pair": p.pair,
                "asset": p.asset,
                "quantity": float(p.quantity),
                "avg_entry_price": float(p.avg_entry_price),
                "current_price": float(p.current_price),
                "notional_value": float(p.notional_value),
                "unrealized_pnl": float(p.unrealized_pnl),
            }
            for p in pos_result.scalars().all()
        ]
        return LedgerSnapshot(
            cash_balance=float(account.cash_balance),
            debt_balance=float(account.debt_balance),
            equity=float(account.equity),
            realized_pnl=float(account.realized_pnl),
            unrealized_pnl=float(account.unrealized_pnl),
            positions=positions,
        )

    def snapshot_to_dict(self, snap: LedgerSnapshot) -> dict[str, Any]:
        return {
            "cash_balance": snap.cash_balance,
            "debt_balance": snap.debt_balance,
            "equity": snap.equity,
            "realized_pnl": snap.realized_pnl,
            "unrealized_pnl": snap.unrealized_pnl,
            "positions": snap.positions,
        }

    async def daily_realized_loss(self, session: AsyncSession, panda_id: str) -> float:
        today = datetime.now(timezone.utc).date()
        result = await session.execute(
            select(func.coalesce(func.sum(TradeFact.realized_pnl), 0)).where(
                TradeFact.panda_id == panda_id,
                TradeFact.realized_pnl < 0,
                func.date(TradeFact.created_at) == today,
            )
        )
        total = result.scalar_one()
        return abs(float(total or 0))

    async def apply_execution(
        self,
        session: AsyncSession,
        *,
        account: PandaAccount,
        panda_id: str,
        order_intent_id: str,
        pair: str,
        asset: str,
        side: str,
        notional: float,
        reference_price: float,
    ) -> LedgerMutationResult:
        before = self.snapshot_to_dict(await self.snapshot(session, account))
        price = max(reference_price, 1e-9)
        quantity = notional / price
        entry_ids: list[str] = []
        realized_delta = 0.0
        avg_entry_before_sell: float | None = None

        pos_result = await session.execute(
            select(PandaPosition).where(
                PandaPosition.account_id == account.id,
                PandaPosition.pair == pair,
            )
        )
        position = pos_result.scalar_one_or_none()

        if side == "BUY":
            spend = min(notional, float(account.cash_balance))
            if spend <= 0:
                raise ValueError("LEDGER_INSUFFICIENT_BALANCE")
            buy_qty = spend / price
            account.cash_balance = _d(float(account.cash_balance) - spend)
            if position is None:
                position = PandaPosition(
                    panda_id=panda_id,
                    account_id=account.id,
                    pair=pair,
                    asset=asset,
                    quantity=_d(buy_qty),
                    avg_entry_price=_d(price),
                    current_price=_d(price),
                    notional_value=_d(spend),
                )
                session.add(position)
            else:
                old_qty = float(position.quantity)
                new_qty = old_qty + buy_qty
                avg = (
                    (old_qty * float(position.avg_entry_price) + buy_qty * price) / new_qty
                    if new_qty > 0
                    else price
                )
                position.quantity = _d(new_qty)
                position.avg_entry_price = _d(avg)
                position.current_price = _d(price)
                position.notional_value = _d(new_qty * price)
            quantity = buy_qty
            entry = LedgerEntry(
                panda_id=panda_id,
                account_id=account.id,
                order_intent_id=order_intent_id,
                entry_type="buy",
                asset=asset,
                amount=_d(buy_qty),
                price=_d(price),
            )
            session.add(entry)
            await session.flush()
            entry_ids.append(entry.id)

        elif side == "SELL":
            if position is None or float(position.quantity) <= 0:
                raise ValueError("LEDGER_POSITION_NOT_FOUND")
            avg_entry_before_sell = float(position.avg_entry_price)
            sell_qty = min(quantity, float(position.quantity))
            proceeds = sell_qty * price
            cost_basis = sell_qty * float(position.avg_entry_price)
            realized_delta = proceeds - cost_basis
            account.cash_balance = _d(float(account.cash_balance) + proceeds)
            account.realized_pnl = _d(float(account.realized_pnl) + realized_delta)
            new_qty = float(position.quantity) - sell_qty
            position.quantity = _d(new_qty)
            position.current_price = _d(price)
            position.notional_value = _d(new_qty * price)
            position.unrealized_pnl = _d(new_qty * (price - float(position.avg_entry_price)))
            quantity = sell_qty
            entry = LedgerEntry(
                panda_id=panda_id,
                account_id=account.id,
                order_intent_id=order_intent_id,
                entry_type="sell",
                asset=asset,
                amount=_d(sell_qty),
                price=_d(price),
            )
            session.add(entry)
            await session.flush()
            entry_ids.append(entry.id)

        await self._refresh_equity(session, account)
        after_snap = await self.snapshot(session, account)
        after = self.snapshot_to_dict(after_snap)

        for entry_id in entry_ids:
            entry_row = await session.get(LedgerEntry, entry_id)
            if entry_row:
                entry_row.cash_after = account.cash_balance
                entry_row.debt_after = account.debt_balance
                entry_row.equity_after = account.equity

        return LedgerMutationResult(
            ledger_before=before,
            ledger_after=after,
            entry_ids=entry_ids,
            realized_pnl_delta=realized_delta,
            quantity=quantity,
            avg_entry_price_before_sell=avg_entry_before_sell,
        )

    async def _refresh_equity(self, session: AsyncSession, account: PandaAccount) -> None:
        pos_result = await session.execute(
            select(PandaPosition).where(PandaPosition.account_id == account.id)
        )
        unrealized = 0.0
        for pos in pos_result.scalars().all():
            qty = float(pos.quantity)
            if qty <= 0:
                continue
            mark = float(pos.current_price)
            avg = float(pos.avg_entry_price)
            pos.unrealized_pnl = _d(qty * (mark - avg))
            pos.notional_value = _d(qty * mark)
            unrealized += float(pos.unrealized_pnl)
        account.unrealized_pnl = _d(unrealized)
        account.equity = _d(float(account.cash_balance) + unrealized - float(account.debt_balance))

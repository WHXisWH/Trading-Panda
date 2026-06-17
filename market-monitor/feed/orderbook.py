from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OrderbookSummary:
    mid_price: float
    spread_bps: float
    bid_depth: float
    ask_depth: float
    best_bid: float
    best_ask: float


def orderbook_summary(book: dict[str, Any], depth: int = 10) -> OrderbookSummary:
    bids = _levels(book.get("bids") or book.get("bid") or [])
    asks = _levels(book.get("asks") or book.get("ask") or [])
    bid_depth = sum(size for _, size in bids[:depth])
    ask_depth = sum(size for _, size in asks[:depth])
    best_bid = bids[0][0] if bids else 0.0
    best_ask = asks[0][0] if asks else 0.0
    if best_bid > 0 and best_ask > 0:
        mid = (best_bid + best_ask) / 2.0
        spread_bps = ((best_ask - best_bid) / mid) * 10_000 if mid > 0 else 9999.0
    elif best_bid > 0:
        mid = best_bid
        spread_bps = 9999.0
    elif best_ask > 0:
        mid = best_ask
        spread_bps = 9999.0
    else:
        mid = 0.0
        spread_bps = 9999.0
    return OrderbookSummary(
        mid_price=mid,
        spread_bps=round(spread_bps, 4),
        bid_depth=round(bid_depth, 6),
        ask_depth=round(ask_depth, 6),
        best_bid=best_bid,
        best_ask=best_ask,
    )


def orderbook_imbalance(book: dict[str, Any], depth: int = 10) -> float:
    """
    (bid_qty - ask_qty) / (bid_qty + ask_qty), in [-1, 1].
    Supports bids/asks as [[price, qty], ...] or [{"price", "quantity"}, ...].
    """
    bids = _levels(book.get("bids") or book.get("bid") or [])
    asks = _levels(book.get("asks") or book.get("ask") or [])
    bid_qty = sum(size for _, size in bids[:depth])
    ask_qty = sum(size for _, size in asks[:depth])
    total = bid_qty + ask_qty
    if total <= 0:
        return 0.0
    return (bid_qty - ask_qty) / total


def _levels(raw: Any) -> list[tuple[float, float]]:
    if not isinstance(raw, list):
        return []
    out: list[tuple[float, float]] = []
    for row in raw:
        if isinstance(row, (list, tuple)) and len(row) >= 2:
            out.append((float(row[0]), float(row[1])))
        elif isinstance(row, dict):
            price = row.get("price") or row.get("p")
            qty = row.get("quantity") or row.get("qty") or row.get("size") or row.get("q")
            if price is not None and qty is not None:
                out.append((float(price), float(qty)))
    return out

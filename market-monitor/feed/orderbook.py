from typing import Any


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

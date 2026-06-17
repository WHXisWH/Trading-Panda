from feed.orderbook import orderbook_imbalance, orderbook_summary


def test_orderbook_summary_spread() -> None:
    book = {
        "bids": [[100.0, 10.0], [99.5, 5.0]],
        "asks": [[100.5, 8.0], [101.0, 4.0]],
    }
    summary = orderbook_summary(book, depth=2)
    assert summary.best_bid == 100.0
    assert summary.best_ask == 100.5
    assert summary.mid_price == 100.25
    assert summary.spread_bps > 0
    assert summary.bid_depth == 15.0
    assert summary.ask_depth == 12.0


def test_orderbook_summary_empty() -> None:
    summary = orderbook_summary({})
    assert summary.mid_price == 0.0
    assert summary.spread_bps == 9999.0


def test_orderbook_imbalance_unchanged() -> None:
    book = {"bids": [[1.0, 10.0]], "asks": [[1.1, 2.0]]}
    assert orderbook_imbalance(book) > 0

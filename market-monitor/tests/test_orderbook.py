from feed.orderbook import orderbook_imbalance


def test_balanced_book() -> None:
    book = {"bids": [[1.0, 10], [0.9, 10]], "asks": [[1.1, 10], [1.2, 10]]}
    assert orderbook_imbalance(book) == 0.0


def test_bid_heavy() -> None:
    book = {"bids": [[1.0, 30]], "asks": [[1.1, 10]]}
    assert orderbook_imbalance(book) > 0

from feed.orderbook import orderbook_imbalance


def test_orderbook_imbalance_string_levels() -> None:
    book = {
        "bids": [["3.5", "100"], ["3.4", "50"]],
        "asks": [["3.6", "80"]],
    }
    imbalance = orderbook_imbalance(book, depth=10)
    assert imbalance > 0

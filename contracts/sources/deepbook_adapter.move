module trading_panda::deepbook_adapter {
    const E_EMPTY_BOOK: u64 = 80;
    const E_DEPTH_MISMATCH: u64 = 81;
    const E_INSUFFICIENT_DEPTH: u64 = 82;

    /// Return the first price level from an off-chain DeepBook snapshot.
    public fun get_best_price(prices: &vector<u64>): u64 {
        assert!(!vector::is_empty(prices), E_EMPTY_BOOK);
        *vector::borrow(prices, 0)
    }

    /// Simulate a market fill against a price/quantity ladder.
    /// Returns (average_price, total_cost) using integer division.
    public fun simulate_market_order(
        prices: vector<u64>,
        quantities: vector<u64>,
        target_quantity: u64,
    ): (u64, u64) {
        let depth = vector::length(&prices);
        assert!(depth == vector::length(&quantities), E_DEPTH_MISMATCH);

        let mut i = 0;
        let mut remaining = target_quantity;
        let mut filled = 0;
        let mut total_cost = 0;

        while (i < depth && remaining > 0) {
            let price = *vector::borrow(&prices, i);
            let available = *vector::borrow(&quantities, i);
            let fill = if (available > remaining) { remaining } else { available };
            filled = filled + fill;
            total_cost = total_cost + fill * price;
            remaining = remaining - fill;
            i = i + 1;
        };

        assert!(remaining == 0, E_INSUFFICIENT_DEPTH);
        (total_cost / filled, total_cost)
    }
}

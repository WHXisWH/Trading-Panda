/// DeepBook adapter — stateless utility for market data + simulated execution.
/// MVP: used as data source only; no real funds moved.
/// Doc ref: docs/PRD.md §10, docs/contract-design.md §deepbook_adapter
module trading_panda::deepbook_adapter {
    // TODO: import deepbook package once available on testnet
    // use deepbook::clob_v2::{Self, Pool};

    /// Query best bid/ask from DeepBook pool.
    public fun get_best_price(
        _pool_id: address,
        _is_bid: bool,
    ): u64 {
        // TODO: implement DeepBook pool query
        0
    }

    /// Simulate a limit order submission (testnet only, no real settlement).
    public fun simulate_order(
        _pool_id: address,
        _price: u64,
        _quantity: u64,
        _is_bid: bool,
        _ctx: &mut sui::tx_context::TxContext,
    ) {
        // TODO: submit to DeepBook testnet pool
    }
}

/// Global registry — tracks mint stats and supply cap.
/// Doc ref: docs/contract-design.md §2.1
module trading_panda::panda_registry {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    public struct PandaRegistry has key {
        id: UID,
        total_minted: u64,
        active_count: u64,
        dormant_count: u64,
        max_supply: u64,
        mint_enabled: bool,
    }

    fun init(ctx: &mut TxContext) {
        sui::transfer::share_object(PandaRegistry {
            id: object::new(ctx),
            total_minted: 0,
            active_count: 0,
            dormant_count: 0,
            max_supply: 10_000,
            mint_enabled: true,
        });
    }

    public fun total_minted(r: &PandaRegistry): u64 { r.total_minted }
    public fun mint_enabled(r: &PandaRegistry): bool { r.mint_enabled }
    public fun max_supply(r: &PandaRegistry): u64 { r.max_supply }

    public(package) fun increment_minted(r: &mut PandaRegistry) {
        r.total_minted = r.total_minted + 1;
        r.active_count = r.active_count + 1;
    }
}

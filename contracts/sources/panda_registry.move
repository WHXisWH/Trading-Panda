module trading_panda::panda_registry {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    const E_NO_ACTIVE_PANDAS: u64 = 10;
    const E_NO_DORMANT_PANDAS: u64 = 11;

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
    public fun active_count(r: &PandaRegistry): u64 { r.active_count }
    public fun dormant_count(r: &PandaRegistry): u64 { r.dormant_count }
    public fun mint_enabled(r: &PandaRegistry): bool { r.mint_enabled }
    public fun max_supply(r: &PandaRegistry): u64 { r.max_supply }

    public fun get_stats(r: &PandaRegistry): (u64, u64, u64, u64) {
        (r.total_minted, r.active_count, r.dormant_count, r.max_supply)
    }

    public(package) fun increment_minted(r: &mut PandaRegistry) {
        r.total_minted = r.total_minted + 1;
        r.active_count = r.active_count + 1;
    }

    public(package) fun set_max_supply_internal(r: &mut PandaRegistry, new_max: u64) {
        r.max_supply = new_max;
    }

    public(package) fun set_mint_enabled_internal(r: &mut PandaRegistry, enabled: bool) {
        r.mint_enabled = enabled;
    }

    public(package) fun increment_dormant(r: &mut PandaRegistry) {
        assert!(r.active_count > 0, E_NO_ACTIVE_PANDAS);
        r.active_count = r.active_count - 1;
        r.dormant_count = r.dormant_count + 1;
    }

    public(package) fun decrement_dormant(r: &mut PandaRegistry) {
        assert!(r.dormant_count > 0, E_NO_DORMANT_PANDAS);
        r.dormant_count = r.dormant_count - 1;
        r.active_count = r.active_count + 1;
    }

    #[test_only]
    public fun new_for_testing(ctx: &mut TxContext): PandaRegistry {
        PandaRegistry {
            id: object::new(ctx),
            total_minted: 0,
            active_count: 0,
            dormant_count: 0,
            max_supply: 10_000,
            mint_enabled: true,
        }
    }

    #[test_only]
    public fun destroy_for_testing(registry: PandaRegistry) {
        let PandaRegistry { id, total_minted: _, active_count: _, dormant_count: _, max_supply: _, mint_enabled: _ } = registry;
        object::delete(id);
    }
}

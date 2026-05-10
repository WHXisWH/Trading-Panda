/// Achievement system — on-chain unlock records.
/// Doc ref: docs/contract-design.md §achievement
module trading_panda::achievement {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::event;
    use std::string::String;

    public struct AchievementRegistry has key {
        id: UID,
        total_defined: u64,
    }

    public struct AchievementUnlocked has copy, drop {
        user_addr: address,
        panda_id: address,
        achievement_code: String,
        timestamp: u64,
    }

    fun init(ctx: &mut TxContext) {
        sui::transfer::share_object(AchievementRegistry {
            id: object::new(ctx),
            total_defined: 0,
        });
    }

    public fun emit_unlock(user_addr: address, panda_id: address, code: String, timestamp: u64) {
        event::emit(AchievementUnlocked { user_addr, panda_id, achievement_code: code, timestamp });
    }
}

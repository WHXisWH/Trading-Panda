/// Strategy hash storage — on-chain proof that strategy wasn't swapped.
/// Stored as Dynamic Field on Panda object.
/// Doc ref: docs/contract-design.md §2.2
module trading_panda::strategy {
    use sui::dynamic_field;
    use sui::object::UID;
    use std::string::String;

    public struct StrategySnapshot has store, drop {
        strategy_hash: vector<u8>,   // SHA-256 of parsed_json
        strategy_type: String,
        updated_at: u64,
        proficiency: u16,            // 0–10000 (×100 for precision)
    }

    const KEY_CURRENT: vector<u8> = b"current_strategy";

    public fun update_strategy(
        panda_id: &mut UID,
        hash: vector<u8>,
        strategy_type: String,
        timestamp: u64,
    ) {
        let snapshot = StrategySnapshot {
            strategy_hash: hash,
            strategy_type,
            updated_at: timestamp,
            proficiency: 0,
        };
        if (dynamic_field::exists(panda_id, KEY_CURRENT)) {
            *dynamic_field::borrow_mut(panda_id, KEY_CURRENT) = snapshot;
        } else {
            dynamic_field::add(panda_id, KEY_CURRENT, snapshot);
        }
    }

    public fun update_proficiency(panda_id: &mut UID, new_proficiency: u16) {
        let snapshot: &mut StrategySnapshot = dynamic_field::borrow_mut(panda_id, KEY_CURRENT);
        snapshot.proficiency = new_proficiency;
    }
}

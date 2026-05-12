module trading_panda::strategy {
    use sui::dynamic_field;
    use sui::event;
    use sui::object::{Self, ID};
    use std::string::String;
    use sui::clock::{Self, Clock};
    use sui::tx_context::TxContext;
    use trading_panda::panda::{Self, AdminCap, Panda};

    const E_NO_STRATEGY: u64 = 20;

    public struct StrategySnapshot has store, drop {
        strategy_hash: vector<u8>,
        strategy_type: String,
        updated_at: u64,
        proficiency: u16,
    }

    public struct StrategyShadow has store, drop {
        strategy_hash: vector<u8>,
        switch_timestamp: u64,
        proficiency_at_switch: u16,
        duration_ms: u64,
    }

    public struct StrategyShadowIndex has store, drop {
        count: u64,
        total_switches: u64,
    }

    public struct StrategyShadowKey has copy, drop, store {
        index: u64,
    }

    public struct StrategyUpdated has copy, drop {
        panda_id: ID,
        strategy_hash: vector<u8>,
        strategy_type: String,
        timestamp: u64,
    }

    public struct StrategySwitched has copy, drop {
        panda_id: ID,
        old_strategy_hash: vector<u8>,
        proficiency_at_switch: u16,
        timestamp: u64,
    }

    const KEY_CURRENT: vector<u8> = b"current_strategy";
    const KEY_SHADOWS: vector<u8> = b"strategy_shadows";

    public entry fun update_strategy(
        panda: &mut Panda,
        _admin: &AdminCap,
        hash: vector<u8>,
        strategy_type: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        let timestamp = clock::timestamp_ms(clock);
        if (dynamic_field::exists(panda::uid(panda), KEY_CURRENT)) {
            let old: StrategySnapshot = dynamic_field::remove(panda::uid_mut(panda), KEY_CURRENT);
            record_shadow(panda, old, timestamp);
        };

        let snapshot = StrategySnapshot {
            strategy_hash: hash,
            strategy_type,
            updated_at: timestamp,
            proficiency: 0,
        };
        dynamic_field::add(panda::uid_mut(panda), KEY_CURRENT, snapshot);

        event::emit(StrategyUpdated {
            panda_id: object::id(panda),
            strategy_hash: hash,
            strategy_type,
            timestamp,
        });
    }

    public entry fun update_proficiency(
        panda: &mut Panda,
        _admin: &AdminCap,
        new_proficiency: u16,
        _ctx: &mut TxContext,
    ) {
        assert!(dynamic_field::exists(panda::uid(panda), KEY_CURRENT), E_NO_STRATEGY);
        let snapshot: &mut StrategySnapshot = dynamic_field::borrow_mut(panda::uid_mut(panda), KEY_CURRENT);
        snapshot.proficiency = new_proficiency;
    }

    fun record_shadow(panda: &mut Panda, old: StrategySnapshot, now: u64) {
        if (!dynamic_field::exists(panda::uid(panda), KEY_SHADOWS)) {
            dynamic_field::add(panda::uid_mut(panda), KEY_SHADOWS, StrategyShadowIndex { count: 0, total_switches: 0 });
        };

        let shadow_index = {
            let index_ref: &StrategyShadowIndex = dynamic_field::borrow(panda::uid(panda), KEY_SHADOWS);
            index_ref.count
        };
        let shadow_key = StrategyShadowKey { index: shadow_index };
        let old_hash = old.strategy_hash;
        let old_proficiency = old.proficiency;
        dynamic_field::add(panda::uid_mut(panda), shadow_key, StrategyShadow {
            strategy_hash: old_hash,
            switch_timestamp: now,
            proficiency_at_switch: old_proficiency,
            duration_ms: now - old.updated_at,
        });

        let index_ref: &mut StrategyShadowIndex = dynamic_field::borrow_mut(panda::uid_mut(panda), KEY_SHADOWS);
        index_ref.count = index_ref.count + 1;
        index_ref.total_switches = index_ref.total_switches + 1;

        event::emit(StrategySwitched {
            panda_id: object::id(panda),
            old_strategy_hash: old_hash,
            proficiency_at_switch: old_proficiency,
            timestamp: now,
        });
    }

    public fun has_current_strategy(panda: &Panda): bool {
        dynamic_field::exists(panda::uid(panda), KEY_CURRENT)
    }

    public fun get_current_strategy(panda: &Panda): &StrategySnapshot {
        dynamic_field::borrow(panda::uid(panda), KEY_CURRENT)
    }

    public fun get_shadow(panda: &Panda, index: u64): &StrategyShadow {
        dynamic_field::borrow(panda::uid(panda), StrategyShadowKey { index })
    }

    public fun get_switch_count(panda: &Panda): u64 {
        if (dynamic_field::exists(panda::uid(panda), KEY_SHADOWS)) {
            let index_ref: &StrategyShadowIndex = dynamic_field::borrow(panda::uid(panda), KEY_SHADOWS);
            index_ref.total_switches
        } else {
            0
        }
    }

    public fun strategy_hash(snapshot: &StrategySnapshot): vector<u8> { snapshot.strategy_hash }
    public fun strategy_type(snapshot: &StrategySnapshot): String { snapshot.strategy_type }
    public fun proficiency(snapshot: &StrategySnapshot): u16 { snapshot.proficiency }
    public fun shadow_hash(shadow: &StrategyShadow): vector<u8> { shadow.strategy_hash }
    public fun shadow_proficiency(shadow: &StrategyShadow): u16 { shadow.proficiency_at_switch }
}

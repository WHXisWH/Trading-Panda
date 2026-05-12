module trading_panda::achievement {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::dynamic_field;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::String;
    use trading_panda::panda::{Self, AdminCap, Panda};

    const E_ACHIEVEMENT_NOT_FOUND: u64 = 50;
    const E_ALREADY_UNLOCKED: u64 = 51;

    public struct AchievementRegistry has key {
        id: UID,
        total_achievements: u64,
    }

    public struct AchievementDef has store, drop {
        achievement_id: u64,
        name: String,
        description: String,
        category: u8,
        rarity: u8,
    }

    public struct AchievementUnlock has store, drop {
        achievement_id: u64,
        unlock_timestamp: u64,
        unlock_context: String,
    }

    public struct AchievementIndex has store, drop {
        unlocked_count: u64,
        unlocked_ids: vector<u64>,
    }

    public struct AchievementKey has copy, drop, store {
        achievement_id: u64,
    }

    public struct AchievementDefined has copy, drop {
        achievement_id: u64,
        name: String,
        category: u8,
        rarity: u8,
    }

    public struct AchievementUnlocked has copy, drop {
        panda_id: object::ID,
        achievement_id: u64,
        unlock_context: String,
        timestamp: u64,
    }

    const KEY_INDEX: vector<u8> = b"achievements";

    fun init(ctx: &mut TxContext) {
        sui::transfer::share_object(AchievementRegistry {
            id: object::new(ctx),
            total_achievements: 0,
        });
    }

    public entry fun define_achievement(
        registry: &mut AchievementRegistry,
        _admin: &AdminCap,
        name: String,
        description: String,
        category: u8,
        rarity: u8,
        _ctx: &mut TxContext,
    ) {
        let achievement_id = registry.total_achievements;
        dynamic_field::add(&mut registry.id, achievement_id, AchievementDef {
            achievement_id,
            name,
            description,
            category,
            rarity,
        });
        registry.total_achievements = achievement_id + 1;

        event::emit(AchievementDefined { achievement_id, name, category, rarity });
    }

    public entry fun unlock_achievement(
        panda: &mut Panda,
        registry: &AchievementRegistry,
        _admin: &AdminCap,
        achievement_id: u64,
        unlock_context: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(dynamic_field::exists(&registry.id, achievement_id), E_ACHIEVEMENT_NOT_FOUND);
        let achievement_key = AchievementKey { achievement_id };
        assert!(!dynamic_field::exists(panda::uid(panda), achievement_key), E_ALREADY_UNLOCKED);

        let timestamp = clock::timestamp_ms(clock);
        dynamic_field::add(panda::uid_mut(panda), achievement_key, AchievementUnlock {
            achievement_id,
            unlock_timestamp: timestamp,
            unlock_context,
        });

        if (!dynamic_field::exists(panda::uid(panda), KEY_INDEX)) {
            dynamic_field::add(panda::uid_mut(panda), KEY_INDEX, AchievementIndex {
                unlocked_count: 0,
                unlocked_ids: vector[],
            });
        };

        let index_ref: &mut AchievementIndex = dynamic_field::borrow_mut(panda::uid_mut(panda), KEY_INDEX);
        index_ref.unlocked_count = index_ref.unlocked_count + 1;
        vector::push_back(&mut index_ref.unlocked_ids, achievement_id);

        event::emit(AchievementUnlocked {
            panda_id: object::id(panda),
            achievement_id,
            unlock_context,
            timestamp,
        });
    }

    public fun get_achievement_def(registry: &AchievementRegistry, achievement_id: u64): &AchievementDef {
        dynamic_field::borrow(&registry.id, achievement_id)
    }

    public fun get_unlocked_achievements(panda: &Panda): vector<u64> {
        if (dynamic_field::exists(panda::uid(panda), KEY_INDEX)) {
            let index_ref: &AchievementIndex = dynamic_field::borrow(panda::uid(panda), KEY_INDEX);
            index_ref.unlocked_ids
        } else {
            vector[]
        }
    }

    public fun total_achievements(registry: &AchievementRegistry): u64 {
        registry.total_achievements
    }

    public fun achievement_name(def: &AchievementDef): String { def.name }
    public fun achievement_rarity(def: &AchievementDef): u8 { def.rarity }

    #[test_only]
    public fun new_registry_for_testing(ctx: &mut TxContext): AchievementRegistry {
        AchievementRegistry { id: object::new(ctx), total_achievements: 0 }
    }

    #[test_only]
    public fun destroy_registry_for_testing(registry: AchievementRegistry) {
        let AchievementRegistry { mut id, total_achievements } = registry;
        let mut i = 0;
        while (i < total_achievements) {
            let _def: AchievementDef = dynamic_field::remove(&mut id, i);
            i = i + 1;
        };
        object::delete(id);
    }
}

module trading_panda::experience {
    use sui::dynamic_field;
    use sui::event;
    use sui::object::{Self, ID};
    use sui::clock::{Self, Clock};
    use sui::tx_context::TxContext;
    use std::string::String;
    use trading_panda::panda::{Self, AdminCap, Panda};

    const E_INVALID_LEVEL: u64 = 30;

    public struct ExperienceDigest has store, drop {
        level: u16,
        total_trades: u64,
        win_rate: u64,
        walrus_blob_id: String,
        last_updated: u64,
    }

    public struct ExperienceMilestone has copy, drop {
        panda_id: ID,
        level: u16,
        total_trades: u64,
        win_rate: u64,
        stage: u8,
        walrus_blob_id: String,
        timestamp: u64,
    }

    const KEY: vector<u8> = b"experience";

    public entry fun update_milestone(
        panda: &mut Panda,
        _admin: &AdminCap,
        level: u16,
        total_trades: u64,
        win_rate: u64,
        walrus_blob_id: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(level <= 100, E_INVALID_LEVEL);
        let timestamp = clock::timestamp_ms(clock);

        if (dynamic_field::exists(panda::uid(panda), KEY)) {
            let _old: ExperienceDigest = dynamic_field::remove(panda::uid_mut(panda), KEY);
        };

        dynamic_field::add(panda::uid_mut(panda), KEY, ExperienceDigest {
            level,
            total_trades,
            win_rate,
            walrus_blob_id,
            last_updated: timestamp,
        });

        event::emit(ExperienceMilestone {
            panda_id: object::id(panda),
            level,
            total_trades,
            win_rate,
            stage: growth_stage(level),
            walrus_blob_id,
            timestamp,
        });
    }

    public fun has_experience(panda: &Panda): bool {
        dynamic_field::exists(panda::uid(panda), KEY)
    }

    public fun get_experience(panda: &Panda): &ExperienceDigest {
        dynamic_field::borrow(panda::uid(panda), KEY)
    }

    public fun get_level(panda: &Panda): u16 {
        if (dynamic_field::exists(panda::uid(panda), KEY)) {
            let digest: &ExperienceDigest = dynamic_field::borrow(panda::uid(panda), KEY);
            digest.level
        } else {
            0
        }
    }

    public fun level(digest: &ExperienceDigest): u16 { digest.level }
    public fun total_trades(digest: &ExperienceDigest): u64 { digest.total_trades }
    public fun win_rate(digest: &ExperienceDigest): u64 { digest.win_rate }
    public fun walrus_blob_id(digest: &ExperienceDigest): String { digest.walrus_blob_id }

    fun growth_stage(level: u16): u8 {
        if (level < 25) {
            0
        } else if (level < 65) {
            1
        } else {
            2
        }
    }
}

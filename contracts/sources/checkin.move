module trading_panda::checkin {
    use sui::clock::{Self, Clock};
    use sui::dynamic_field;
    use sui::event;
    use sui::object;
    use sui::tx_context::TxContext;
    use trading_panda::panda::{Self, AdminCap, Panda};

    const E_ALREADY_CLAIMED: u64 = 70;

    public struct CheckinReward has store, drop {
        reward_id: u64,
        reward_type: u8,
        amount: u64,
        claimed_at: u64,
    }

    public struct CheckinRewardKey has copy, drop, store {
        reward_id: u64,
    }

    public struct CheckinRewardGranted has copy, drop {
        panda_id: object::ID,
        reward_id: u64,
        reward_type: u8,
        amount: u64,
        timestamp: u64,
    }

    public entry fun grant_checkin_reward(
        panda: &mut Panda,
        _admin: &AdminCap,
        reward_id: u64,
        reward_type: u8,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        let key = CheckinRewardKey { reward_id };
        assert!(!dynamic_field::exists(panda::uid(panda), key), E_ALREADY_CLAIMED);

        let timestamp = clock::timestamp_ms(clock);
        dynamic_field::add(panda::uid_mut(panda), key, CheckinReward {
            reward_id,
            reward_type,
            amount,
            claimed_at: timestamp,
        });

        event::emit(CheckinRewardGranted {
            panda_id: object::id(panda),
            reward_id,
            reward_type,
            amount,
            timestamp,
        });
    }

    public fun has_reward(panda: &Panda, reward_id: u64): bool {
        dynamic_field::exists(panda::uid(panda), CheckinRewardKey { reward_id })
    }

    public fun get_reward(panda: &Panda, reward_id: u64): &CheckinReward {
        dynamic_field::borrow(panda::uid(panda), CheckinRewardKey { reward_id })
    }

    public fun reward_amount(reward: &CheckinReward): u64 { reward.amount }
}

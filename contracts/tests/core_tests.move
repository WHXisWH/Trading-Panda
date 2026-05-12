#[test_only]
module trading_panda::core_tests {
    use std::string;
    use sui::clock;
    use sui::transfer;
    use sui::tx_context;
    use trading_panda::achievement;
    use trading_panda::checkin;
    use trading_panda::deepbook_adapter;
    use trading_panda::experience;
    use trading_panda::panda;
    use trading_panda::panda_registry;
    use trading_panda::strategy;
    use trading_panda::trust_proof;

    #[test]
    fun test_registry_admin_controls() {
        let ctx = &mut tx_context::dummy();
        let mut registry = panda_registry::new_for_testing(ctx);
        let admin = panda::new_admin_for_testing(ctx);

        panda::set_max_supply(&mut registry, &admin, 7);
        panda::set_mint_enabled(&mut registry, &admin, false);

        assert!(panda_registry::max_supply(&registry) == 7, 0);
        assert!(!panda_registry::mint_enabled(&registry), 1);

        panda_registry::destroy_for_testing(registry);
        panda::destroy_admin_for_testing(admin);
    }

    #[test]
    fun test_strategy_update_records_shadow() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        strategy::update_strategy(&mut panda, &admin, vector[1, 2, 3], string::utf8(b"trend"), &clock, ctx);
        strategy::update_proficiency(&mut panda, &admin, 4200, ctx);
        strategy::update_strategy(&mut panda, &admin, vector[9, 9, 9], string::utf8(b"mean"), &clock, ctx);

        let current = strategy::get_current_strategy(&panda);
        let shadow = strategy::get_shadow(&panda, 0);

        assert!(strategy::strategy_hash(current) == vector[9, 9, 9], 0);
        assert!(strategy::get_switch_count(&panda) == 1, 1);
        assert!(strategy::shadow_hash(shadow) == vector[1, 2, 3], 2);
        assert!(strategy::shadow_proficiency(shadow) == 4200, 3);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_experience_update_milestone() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        experience::update_milestone(
            &mut panda,
            &admin,
            65,
            120,
            6523,
            string::utf8(b"walrus-blob-1"),
            &clock,
            ctx,
        );

        let digest = experience::get_experience(&panda);
        assert!(experience::get_level(&panda) == 65, 0);
        assert!(experience::total_trades(digest) == 120, 1);
        assert!(experience::win_rate(digest) == 6523, 2);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_submit_and_verify_merkle_root() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        let leaf = vector[1, 1, 1];
        let sibling = vector[2, 2, 2];
        let root = trust_proof::compute_merkle_root(leaf, vector[sibling], 0);

        trust_proof::submit_merkle_root(&mut panda, &admin, root, 2, 10, 11, &clock, ctx);
        let (count, total) = trust_proof::get_latest_proof_index(&panda);

        assert!(count == 1, 0);
        assert!(total == 2, 1);
        assert!(trust_proof::verify_trade_log(&panda, 0, vector[1, 1, 1], vector[vector[2, 2, 2]], 0), 2);
        assert!(!trust_proof::verify_trade_log(&panda, 0, vector[9], vector[vector[2, 2, 2]], 0), 3);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test, expected_failure(abort_code = 40)]
    fun test_invalid_merkle_root_length() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        trust_proof::submit_merkle_root(&mut panda, &admin, vector[1, 2, 3], 1, 1, 1, &clock, ctx);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_achievement_unlock() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let mut registry = achievement::new_registry_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        achievement::define_achievement(
            &mut registry,
            &admin,
            string::utf8(b"First Win"),
            string::utf8(b"First profitable trade"),
            0,
            1,
            ctx,
        );
        achievement::unlock_achievement(&mut panda, &registry, &admin, 0, string::utf8(b"trade #1"), &clock, ctx);

        let unlocked = achievement::get_unlocked_achievements(&panda);
        assert!(vector::length(&unlocked) == 1, 0);
        assert!(*vector::borrow(&unlocked, 0) == 0, 1);

        transfer::public_transfer(panda, @0x1);
        achievement::destroy_registry_for_testing(registry);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test, expected_failure(abort_code = 51)]
    fun test_duplicate_achievement_unlock() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let mut registry = achievement::new_registry_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        achievement::define_achievement(&mut registry, &admin, string::utf8(b"A"), string::utf8(b"B"), 0, 0, ctx);
        achievement::unlock_achievement(&mut panda, &registry, &admin, 0, string::utf8(b"once"), &clock, ctx);
        achievement::unlock_achievement(&mut panda, &registry, &admin, 0, string::utf8(b"twice"), &clock, ctx);

        transfer::public_transfer(panda, @0x1);
        achievement::destroy_registry_for_testing(registry);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_checkin_reward() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        checkin::grant_checkin_reward(&mut panda, &admin, 100, 1, 30, &clock, ctx);
        let reward = checkin::get_reward(&panda, 100);

        assert!(checkin::has_reward(&panda, 100), 0);
        assert!(checkin::reward_amount(reward) == 30, 1);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test, expected_failure(abort_code = 70)]
    fun test_duplicate_checkin_reward() {
        let ctx = &mut tx_context::dummy();
        let mut panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);

        checkin::grant_checkin_reward(&mut panda, &admin, 100, 1, 30, &clock, ctx);
        checkin::grant_checkin_reward(&mut panda, &admin, 100, 1, 30, &clock, ctx);

        transfer::public_transfer(panda, @0x1);
        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_deepbook_simulation_helpers() {
        let best = deepbook_adapter::get_best_price(&vector[100, 101, 102]);
        let (average, total_cost) = deepbook_adapter::simulate_market_order(vector[100, 110], vector[3, 3], 5);

        assert!(best == 100, 0);
        assert!(average == 104, 1);
        assert!(total_cost == 520, 2);
    }

    #[test, expected_failure(abort_code = 0)]
    fun test_trading_lock_prevents_transfer() {
        let ctx = &mut tx_context::dummy();
        let panda = sample_panda(ctx);
        let admin = panda::new_admin_for_testing(ctx);
        let clock = clock::create_for_testing(ctx);
        let mut locked = panda;

        panda::lock_trading(&mut locked, &admin, &clock);
        panda::transfer_panda(locked, @0x2, &clock, ctx);

        panda::destroy_admin_for_testing(admin);
        clock::destroy_for_testing(clock);
    }

    fun sample_panda(ctx: &mut tx_context::TxContext): panda::Panda {
        panda::new_for_testing(50, 60, 70, 80, 40, 0, 1, ctx)
    }
}

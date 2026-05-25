#[test_only]
module trading_panda::mint_tests {
    use sui::clock;
    use sui::random::{Self, Random};
    use sui::test_scenario;
    use trading_panda::achievement;
    use trading_panda::experience;
    use trading_panda::mint;
    use trading_panda::panda;
    use trading_panda::panda_registry;
    use trading_panda::strategy;
    use trading_panda::trust_proof;

    fun seed_random(scenario: &mut test_scenario::Scenario, sender: address) {
        scenario.next_tx(sender);
        let mut random_state = scenario.take_shared<Random>();
        random::update_randomness_state_for_testing(
            &mut random_state,
            0,
            x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
            scenario.ctx(),
        );
        test_scenario::return_shared(random_state);
    }

    #[test]
    fun test_mint_panda_random_personality_and_dynamic_fields() {
        let minter = @0xA;
        let mut scenario = test_scenario::begin(@0x0);
        random::create_for_testing(scenario.ctx());
        seed_random(&mut scenario, @0x0);
        scenario.next_tx(minter);
        {
            let random_state = scenario.take_shared<Random>();
            let ctx = scenario.ctx();
            let mut registry = panda_registry::new_for_testing(ctx);
            let clock = clock::create_for_testing(ctx);
            mint::mint(&mut registry, &random_state, &clock, ctx);
            test_scenario::return_shared(random_state);
            assert!(panda_registry::total_minted(&registry) == 1, 0);
            assert!(panda_registry::active_count(&registry) == 1, 1);
            panda_registry::destroy_for_testing(registry);
            clock::destroy_for_testing(clock);
        };
        scenario.next_tx(minter);
        {
            let panda_obj = scenario.take_from_sender<panda::Panda>();
            assert!(panda::boldness(&panda_obj) <= 100, 2);
            assert!(panda::patience(&panda_obj) <= 100, 3);
            assert!(panda::intuition(&panda_obj) <= 100, 4);
            assert!(panda::focus(&panda_obj) <= 100, 5);
            assert!(panda::contrarian(&panda_obj) <= 100, 6);
            assert!(panda::talent(&panda_obj) <= 6, 7);
            assert!(panda::generation(&panda_obj) == 1, 8);
            assert!(experience::has_experience_index(&panda_obj), 9);
            assert!(experience::get_level(&panda_obj) == 0, 10);
            assert!(strategy::has_shadow_index(&panda_obj), 11);
            assert!(strategy::get_switch_count(&panda_obj) == 0, 12);
            assert!(trust_proof::has_proof_index(&panda_obj), 13);
            let (proof_count, verified) = trust_proof::get_latest_proof_index(&panda_obj);
            assert!(proof_count == 0 && verified == 0, 14);
            assert!(achievement::has_achievement_index(&panda_obj), 15);
            assert!(vector::length(&achievement::get_unlocked_achievements(&panda_obj)) == 0, 16);
            panda::destroy_for_testing(panda_obj);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = 2, location = trading_panda::panda)]
    fun test_mint_rejects_when_supply_exhausted() {
        let minter = @0xB;
        let mut scenario = test_scenario::begin(@0x0);
        random::create_for_testing(scenario.ctx());
        seed_random(&mut scenario, @0x0);
        scenario.next_tx(minter);
        {
            let random_state = scenario.take_shared<Random>();
            let ctx = scenario.ctx();
            let mut registry = panda_registry::new_for_testing(ctx);
            let admin = panda::new_admin_for_testing(ctx);
            let clock = clock::create_for_testing(ctx);
            panda::set_max_supply(&mut registry, &admin, 0);
            mint::mint(&mut registry, &random_state, &clock, ctx);
            test_scenario::return_shared(random_state);
            panda_registry::destroy_for_testing(registry);
            panda::destroy_admin_for_testing(admin);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }
}

#[test_only]
module trading_panda::agent_wallet_tests {
    use sui::clock;
    use sui::test_scenario::{Self as ts};
    use sui::transfer;
    use trading_panda::agent_wallet;
    use trading_panda::demo_executor;
    use trading_panda::panda;
    use trading_panda::panda_vault::{Self, PandaVault};
    use trading_panda::trading_policy::{Self, TradingPolicy};

    const OWNER: address = @0xA11CE;
    const AGENT: address = @0xA6E47;
    const STRANGER: address = @0xBAD;
    const PAIR_HASH: vector<u8> = b"DEEP/SUI";

    fun sample_panda(ctx: &mut sui::tx_context::TxContext): panda::Panda {
        panda::new_for_testing(50, 50, 50, 50, 50, 1, 1, ctx)
    }

    #[test]
    fun test_owner_creates_vault_and_policy() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let clock = clock::create_for_testing(scenario.ctx());
            agent_wallet::setup_agent_wallet(
                &panda_obj,
                AGENT,
                1,
                PAIR_HASH,
                50,
                8,
                10_000,
                1,
                0,
                10,
                0,
                vector[9, 9, 9],
                &clock,
                scenario.ctx(),
            );
            transfer::public_transfer(panda_obj, OWNER);
            clock::destroy_for_testing(clock);
        };
        scenario.next_tx(OWNER);
        {
            let policy = scenario.take_shared<TradingPolicy>();
            let vault = scenario.take_shared<PandaVault>();
            assert!(trading_policy::authorized_agent(&policy) == AGENT, 0);
            assert!(trading_policy::panda_id(&policy) == panda_vault::panda_id(&vault), 1);
            assert!(trading_policy::id(&policy) == panda_vault::policy_id(&vault), 2);
            ts::return_shared(policy);
            ts::return_shared(vault);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_NOT_OWNER)]
    fun test_non_owner_cannot_update_policy() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(STRANGER);
        {
            let mut policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            trading_policy::update_policy(
                &mut policy,
                PAIR_HASH,
                40,
                6,
                10_000,
                1,
                0,
                10,
                vector[1, 2, 3],
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_NOT_OWNER)]
    fun test_agent_cannot_update_policy() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(AGENT);
        {
            let mut policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            trading_policy::update_policy(
                &mut policy,
                PAIR_HASH,
                40,
                6,
                10_000,
                1,
                0,
                10,
                vector[1, 2, 3],
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_POLICY_LOOSEN)]
    fun test_non_owner_cannot_loosen_policy() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let mut policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            trading_policy::update_policy(
                &mut policy,
                PAIR_HASH,
                100,
                8,
                10_000,
                1,
                0,
                10,
                vector[1, 2, 3],
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_AGENT_REVOKED)]
    fun test_revoked_agent_blocks_demo_executor() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let mut policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            trading_policy::revoke_agent(&mut policy, &clock, scenario.ctx());
            ts::return_shared(policy);
            clock::destroy_for_testing(clock);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_PAUSED)]
    fun test_paused_policy_blocks_demo_executor() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let mut policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            trading_policy::pause_policy(&mut policy, true, &clock, scenario.ctx());
            ts::return_shared(policy);
            clock::destroy_for_testing(clock);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_VERSION_STALE)]
    fun test_stale_policy_version_aborts() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                99,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::panda_vault::E_PANDA_MISMATCH)]
    fun test_mismatched_vault_policy_aborts() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_a = sample_panda(scenario.ctx());
            let panda_b = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_a),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_b),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            panda::destroy_for_testing(panda_a);
            panda::destroy_for_testing(panda_b);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test]
    fun test_legal_demo_trade_succeeds() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1, 2, 3],
                vector[4, 5, 6],
                vector[7, 8, 9],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_NOT_AGENT)]
    fun test_unauthorized_agent_aborts() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(STRANGER);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_PAIR_NOT_ALLOWED)]
    fun test_pair_not_allowed_aborts() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                b"SUI/USDC",
                1,
                10,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::trading_policy::E_NOTIONAL_TOO_LARGE)]
    fun test_notional_exceeded_aborts() {
        let mut scenario = ts::begin(OWNER);
        scenario.next_tx(OWNER);
        {
            let panda_obj = sample_panda(scenario.ctx());
            let policy = trading_policy::new_for_testing(
                panda::id(&panda_obj),
                OWNER,
                AGENT,
                PAIR_HASH,
                50,
                8,
                scenario.ctx(),
            );
            let vault = panda_vault::new_for_testing(
                panda::id(&panda_obj),
                trading_policy::id(&policy),
                OWNER,
                AGENT,
                scenario.ctx(),
            );
            trading_policy::share_policy(policy);
            panda_vault::share_vault(vault);
            transfer::public_transfer(panda_obj, OWNER);
        };
        scenario.next_tx(AGENT);
        {
            let mut vault = scenario.take_shared<PandaVault>();
            let policy = scenario.take_shared<TradingPolicy>();
            let clock = clock::create_for_testing(scenario.ctx());
            demo_executor::execute_demo_trade(
                &mut vault,
                &policy,
                PAIR_HASH,
                1,
                100,
                100,
                vector[1],
                vector[2],
                vector[3],
                1,
                1,
                0,
                &clock,
                scenario.ctx(),
            );
            ts::return_shared(policy);
            ts::return_shared(vault);
            clock::destroy_for_testing(clock);
        };
        scenario.end();
    }
}

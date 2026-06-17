#[test_only]
module trading_panda::panda_vault_tests {
    use sui::coin;
    use sui::test_scenario::{Self as ts};
    use sui::transfer;
    use trading_panda::panda_coin::{Self, PandaTrainingToken};
    use trading_panda::panda_vault::{Self, PandaVault};

    const OWNER: address = @0xA11CE;
    const STRANGER: address = @0xBAD;
    const PANDA_ID: address = @0x1;
    const POLICY_ID: address = @0x2;

    #[test]
    fun test_deposit_and_withdraw_training_credit() {
        let mut scenario = ts::begin(@0x0);
        scenario.next_tx(@0x0);
        {
            let treasury = panda_coin::init_for_testing(scenario.ctx());
            transfer::public_transfer(treasury, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let vault = panda_vault::new_for_testing(
                sui::object::id_from_address(PANDA_ID),
                sui::object::id_from_address(POLICY_ID),
                OWNER,
                @0xA6E47,
                scenario.ctx(),
            );
            panda_vault::share_vault(vault);
        };
        scenario.next_tx(OWNER);
        {
            let mut treasury = scenario.take_from_sender<sui::coin::TreasuryCap<PandaTrainingToken>>();
            panda_coin::mint_training_credit(&mut treasury, 1_000_000, OWNER, scenario.ctx());
            transfer::public_transfer(treasury, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let coin = scenario.take_from_sender<sui::coin::Coin<PandaTrainingToken>>();
            let mut vault = scenario.take_shared<PandaVault>();
            panda_vault::deposit_training_credit(&mut vault, coin, scenario.ctx());
            assert!(panda_vault::training_credit_balance(&vault) == 1_000_000, 0);
            panda_vault::withdraw_training_credit(&mut vault, 400_000, scenario.ctx());
            assert!(panda_vault::training_credit_balance(&vault) == 600_000, 1);
            ts::return_shared(vault);
        };
        scenario.end();
    }

    #[test, expected_failure(abort_code = trading_panda::panda_vault::E_NOT_OWNER)]
    fun test_stranger_cannot_deposit_training_credit() {
        let mut scenario = ts::begin(@0x0);
        scenario.next_tx(@0x0);
        {
            let mut treasury = panda_coin::init_for_testing(scenario.ctx());
            panda_coin::mint_training_credit(&mut treasury, 100, STRANGER, scenario.ctx());
            transfer::public_transfer(treasury, OWNER);
        };
        scenario.next_tx(OWNER);
        {
            let vault = panda_vault::new_for_testing(
                sui::object::id_from_address(PANDA_ID),
                sui::object::id_from_address(POLICY_ID),
                OWNER,
                @0xA6E47,
                scenario.ctx(),
            );
            panda_vault::share_vault(vault);
        };
        scenario.next_tx(STRANGER);
        {
            let coin = scenario.take_from_sender<sui::coin::Coin<PandaTrainingToken>>();
            let mut vault = scenario.take_shared<PandaVault>();
            panda_vault::deposit_training_credit(&mut vault, coin, scenario.ctx());
            ts::return_shared(vault);
        };
        scenario.end();
    }
}

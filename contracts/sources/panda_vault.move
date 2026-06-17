/// Shared PandaVault — bounded execution container bound to Panda + TradingPolicy.
module trading_panda::panda_vault {
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use trading_panda::panda::{Self as panda_nft, Panda};
    use trading_panda::panda_coin::PANDA_COIN;
    use trading_panda::trading_policy::{Self, TradingPolicy};

    const STATUS_ACTIVE: u8 = 1;
    const STATUS_PAUSED: u8 = 2;
    const STATUS_REVOKED: u8 = 3;
    const STATUS_CLOSED: u8 = 4;

    const E_NOT_OWNER: u64 = 200;
    const E_POLICY_MISMATCH: u64 = 201;
    const E_PANDA_MISMATCH: u64 = 202;
    const E_VAULT_NOT_ACTIVE: u64 = 203;

    public struct PandaVault has key, store {
        id: UID,
        panda_id: ID,
        owner: address,
        policy_id: ID,
        authorized_agent: address,
        mode: u8,
        panda_coin_balance: Balance<PANDA_COIN>,
        status: u8,
        created_at_ms: u64,
        updated_at_ms: u64,
    }

    public struct PandaVaultCreated has copy, drop {
        vault_id: ID,
        panda_id: ID,
        owner: address,
        policy_id: ID,
        authorized_agent: address,
        mode: u8,
        timestamp_ms: u64,
    }

    public(package) fun create_vault_inner(
        panda: &Panda,
        policy: &TradingPolicy,
        mode: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ): PandaVault {
        let owner = tx_context::sender(ctx);
        assert!(owner == trading_policy::owner(policy), E_NOT_OWNER);
        assert!(trading_policy::panda_id(policy) == panda_nft::id(panda), E_PANDA_MISMATCH);
        let now_ms = clock::timestamp_ms(clock);
        let vault = PandaVault {
            id: object::new(ctx),
            panda_id: panda_nft::id(panda),
            owner,
            policy_id: trading_policy::id(policy),
            authorized_agent: trading_policy::authorized_agent(policy),
            mode,
            panda_coin_balance: balance::zero(),
            status: STATUS_ACTIVE,
            created_at_ms: now_ms,
            updated_at_ms: now_ms,
        };
        event::emit(PandaVaultCreated {
            vault_id: object::id(&vault),
            panda_id: panda_nft::id(panda),
            owner,
            policy_id: trading_policy::id(policy),
            authorized_agent: trading_policy::authorized_agent(policy),
            mode,
            timestamp_ms: now_ms,
        });
        vault
    }

    public fun share_vault(vault: PandaVault) {
        transfer::share_object(vault);
    }

    public entry fun pause_vault(vault: &mut PandaVault, clock: &Clock, ctx: &TxContext) {
        assert_owner(vault, ctx);
        vault.status = STATUS_PAUSED;
        vault.updated_at_ms = clock::timestamp_ms(clock);
    }

    public entry fun close_vault(vault: PandaVault, clock: &Clock, ctx: &TxContext) {
        let PandaVault {
            id,
            panda_id: _,
            owner,
            policy_id: _,
            authorized_agent: _,
            mode: _,
            panda_coin_balance,
            status: _,
            created_at_ms: _,
            updated_at_ms: _,
        } = vault;
        assert!(tx_context::sender(ctx) == owner, E_NOT_OWNER);
        let _ = clock::timestamp_ms(clock);
        balance::destroy_zero(panda_coin_balance);
        object::delete(id);
    }

    public fun assert_owner(vault: &PandaVault, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == vault.owner, E_NOT_OWNER);
    }

    public fun assert_bindings(
        vault: &PandaVault,
        policy: &TradingPolicy,
        expected_policy_version: u64,
    ) {
        assert!(vault.panda_id == trading_policy::panda_id(policy), E_PANDA_MISMATCH);
        assert!(vault.policy_id == trading_policy::id(policy), E_POLICY_MISMATCH);
        trading_policy::assert_version(policy, expected_policy_version);
        assert!(vault.status == STATUS_ACTIVE, E_VAULT_NOT_ACTIVE);
    }

    public fun deposit_panda_coin(vault: &mut PandaVault, coin: Coin<PANDA_COIN>) {
        let bal = coin::into_balance(coin);
        balance::join(&mut vault.panda_coin_balance, bal);
    }

    public fun panda_id(vault: &PandaVault): ID { vault.panda_id }
    public fun policy_id(vault: &PandaVault): ID { vault.policy_id }
    public fun vault_owner(vault: &PandaVault): address { vault.owner }
    public fun status(vault: &PandaVault): u8 { vault.status }
    public fun id(vault: &PandaVault): ID { object::id(vault) }

    #[test_only]
    public fun new_for_testing(
        panda_id: ID,
        policy_id: ID,
        owner: address,
        authorized_agent: address,
        ctx: &mut TxContext,
    ): PandaVault {
        PandaVault {
            id: object::new(ctx),
            panda_id,
            owner,
            policy_id,
            authorized_agent,
            mode: 1,
            panda_coin_balance: balance::zero(),
            status: STATUS_ACTIVE,
            created_at_ms: 0,
            updated_at_ms: 0,
        }
    }

    #[test_only]
    public fun destroy_for_testing(vault: PandaVault) {
        let PandaVault {
            id,
            panda_id: _,
            owner: _,
            policy_id: _,
            authorized_agent: _,
            mode: _,
            panda_coin_balance,
            status: _,
            created_at_ms: _,
            updated_at_ms: _,
        } = vault;
        balance::destroy_zero(panda_coin_balance);
        object::delete(id);
    }
}

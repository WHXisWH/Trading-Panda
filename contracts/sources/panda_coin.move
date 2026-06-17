/// Testnet-only training credit for Mode 2 Chain Proof demos.
module trading_panda::panda_coin {
    use std::option;
    use std::string;
    use sui::coin::{Self, TreasuryCap};
    use sui::coin_registry::{Self, CoinRegistry};
    use sui::transfer;
    use sui::tx_context::TxContext;
    use trading_panda::panda::AdminCap;

    /// Legacy coin marker (OTW layout; witness unavailable after package upgrade without `init`).
    public struct PANDA_COIN has drop {}

    /// Registry-backed coin marker for post-upgrade bootstrap (`new_currency` requires `key`).
    public struct PandaTrainingToken has key {
        id: sui::object::UID,
    }

    public struct PandaCoinAdminCap has key, store {
        id: sui::object::UID,
    }

    /// Legacy one-time setup (requires OTW witness; kept for upgrade compatibility).
    public fun setup_currency(witness: PANDA_COIN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6,
            b"PANDA",
            b"Panda Training Credit",
            b"Testnet-only training credit for TradingPanda demo execution.",
            option::none(),
            ctx,
        );
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_freeze_object(metadata);
        transfer::transfer(
            PandaCoinAdminCap { id: sui::object::new(ctx) },
            tx_context::sender(ctx),
        );
    }

    /// One-time currency setup after upgrade; deployer calls once with package AdminCap.
    public entry fun bootstrap_currency(
        _admin: &AdminCap,
        registry: &mut CoinRegistry,
        ctx: &mut TxContext,
    ) {
        let (initializer, treasury_cap) = coin_registry::new_currency<PandaTrainingToken>(
            registry,
            6,
            string::utf8(b"PANDA"),
            string::utf8(b"Panda Training Credit"),
            string::utf8(b"Testnet-only training credit for TradingPanda demo execution."),
            string::utf8(b""),
            ctx,
        );
        coin_registry::finalize_and_delete_metadata_cap(initializer, ctx);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::transfer(
            PandaCoinAdminCap { id: sui::object::new(ctx) },
            tx_context::sender(ctx),
        );
    }

    public fun mint(
        treasury: &mut TreasuryCap<PANDA_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    public fun mint_training_credit(
        treasury: &mut TreasuryCap<PandaTrainingToken>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext): TreasuryCap<PandaTrainingToken> {
        let mut registry = coin_registry::create_coin_data_registry_for_testing(ctx);
        let (initializer, treasury_cap) = coin_registry::new_currency<PandaTrainingToken>(
            &mut registry,
            6,
            string::utf8(b"PANDA"),
            string::utf8(b"Panda Training Credit"),
            string::utf8(b"Testnet-only training credit for TradingPanda demo execution."),
            string::utf8(b""),
            ctx,
        );
        coin_registry::finalize_and_delete_metadata_cap(initializer, ctx);
        coin_registry::share_for_testing(registry);
        treasury_cap
    }
}

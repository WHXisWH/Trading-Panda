/// Testnet-only training credit for Mode 2 Chain Proof demos.
module trading_panda::panda_coin {
    use std::option;
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::TxContext;

    public struct PANDA_COIN has drop {}

    public struct PandaCoinAdminCap has key, store {
        id: sui::object::UID,
    }

    fun init(witness: PANDA_COIN, ctx: &mut TxContext) {
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

    public fun mint(
        treasury: &mut TreasuryCap<PANDA_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext): TreasuryCap<PANDA_COIN> {
        let (treasury, metadata) = coin::create_currency(
            PANDA_COIN {},
            6,
            b"PANDA",
            b"Panda Training Credit",
            b"Testnet-only training credit for TradingPanda demo execution.",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        treasury
    }
}

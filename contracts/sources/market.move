module trading_panda::market {
    use sui::coin::Coin;
    use sui::event;
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::object::{Self, ID};
    use sui::package::Publisher;
    use sui::sui::SUI;
    use sui::transfer;
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap};
    use sui::tx_context::{Self, TxContext};
    use trading_panda::panda::Panda;

    const E_PANDA_IS_TRADING: u64 = 60;
    const E_INVALID_ROYALTY: u64 = 61;
    const MIN_ROYALTY_BPS: u64 = 200;
    const MAX_ROYALTY_BPS: u64 = 500;

    public struct TransferPolicyCreated has copy, drop {
        royalty_bps: u64,
    }

    public struct PandaListed has copy, drop {
        panda_id: ID,
        price: u64,
        seller: address,
    }

    public struct PandaDelisted has copy, drop {
        panda_id: ID,
    }

    public struct PandaPurchased has copy, drop {
        panda_id: ID,
        buyer: address,
        price: u64,
    }

    public entry fun setup_transfer_policy(
        publisher: &Publisher,
        royalty_bps: u64,
        ctx: &mut TxContext,
    ) {
        assert!(royalty_bps >= MIN_ROYALTY_BPS && royalty_bps <= MAX_ROYALTY_BPS, E_INVALID_ROYALTY);
        let (policy, policy_cap) = transfer_policy::new<Panda>(publisher, ctx);
        transfer::public_share_object(policy);
        transfer::public_transfer(policy_cap, tx_context::sender(ctx));
        event::emit(TransferPolicyCreated { royalty_bps });
    }

    public fun create_transfer_policy(
        publisher: &Publisher,
        ctx: &mut TxContext,
    ): (TransferPolicy<Panda>, TransferPolicyCap<Panda>) {
        transfer_policy::new<Panda>(publisher, ctx)
    }

    public entry fun list_panda(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        panda: Panda,
        price: u64,
        ctx: &mut TxContext,
    ) {
        list(kiosk, cap, panda, price, ctx)
    }

    public fun list(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        panda: Panda,
        price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(!trading_panda::panda::is_trading(&panda), E_PANDA_IS_TRADING);
        let panda_id = object::id(&panda);
        kiosk::place_and_list<Panda>(kiosk, cap, panda, price);
        event::emit(PandaListed { panda_id, price, seller: tx_context::sender(ctx) });
    }

    public entry fun delist_panda(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        panda_id: ID,
        ctx: &mut TxContext,
    ) {
        delist(kiosk, cap, panda_id, ctx)
    }

    public fun delist(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        panda_id: ID,
        ctx: &mut TxContext,
    ) {
        kiosk::delist<Panda>(kiosk, cap, panda_id);
        let panda = kiosk::take<Panda>(kiosk, cap, panda_id);
        event::emit(PandaDelisted { panda_id });
        transfer::public_transfer(panda, tx_context::sender(ctx));
    }

    public entry fun purchase_panda(
        kiosk: &mut Kiosk,
        panda_id: ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<Panda>,
        ctx: &mut TxContext,
    ) {
        let (panda, request) = kiosk::purchase<Panda>(kiosk, panda_id, payment);
        let (confirmed_id, price, _) = transfer_policy::confirm_request<Panda>(policy, request);
        event::emit(PandaPurchased {
            panda_id: confirmed_id,
            buyer: tx_context::sender(ctx),
            price,
        });
        transfer::public_transfer(panda, tx_context::sender(ctx));
    }
}

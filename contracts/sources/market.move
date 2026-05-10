/// Kiosk market integration — list, buy, delist panda NFTs.
/// Royalty: 2–5% enforced by TransferPolicy.
/// Doc ref: docs/contract-design.md §market
module trading_panda::market {
    use sui::kiosk::{Kiosk, KioskOwnerCap};
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap};
    use trading_panda::panda::Panda;

    // ── TransferPolicy setup (called once by AdminCap) ────────────────────────

    public fun create_transfer_policy(
        publisher: &sui::package::Publisher,
        ctx: &mut TxContext,
    ): (TransferPolicy<Panda>, TransferPolicyCap<Panda>) {
        transfer_policy::new<Panda>(publisher, ctx)
    }

    // ── Kiosk operations ──────────────────────────────────────────────────────

    public fun list(
        _kiosk: &mut Kiosk,
        _cap: &KioskOwnerCap,
        _panda: Panda,
        _price: u64,
        _ctx: &mut TxContext,
    ) {
        // TODO: assert !panda.is_trading
        // TODO: kiosk::place_and_list(_kiosk, _cap, _panda, _price)
        abort 0
    }

    public fun delist(
        _kiosk: &mut Kiosk,
        _cap: &KioskOwnerCap,
        _panda_id: sui::object::ID,
        _ctx: &mut TxContext,
    ) {
        // TODO: kiosk::delist + kiosk::take
        abort 0
    }
}

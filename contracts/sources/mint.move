/// Mint entry point: random personality + dynamic_field initialization (avoids module cycles in `panda`).
module trading_panda::mint {
    use sui::clock::Clock;
    use sui::random::Random;
    use sui::tx_context::TxContext;
    use trading_panda::achievement;
    use trading_panda::experience;
    use trading_panda::panda;
    use trading_panda::panda_registry::PandaRegistry;
    use trading_panda::strategy;
    use trading_panda::trust_proof;

    /// Mint a Panda NFT (~0.03 SUI gas incl. dynamic_field init per PRD C17).
    public entry fun mint(
        registry: &mut PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        mint_panda(registry, r, clock, ctx)
    }

    public entry fun mint_panda(
        registry: &mut PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let (mut panda_obj, now_ms) = panda::mint_panda_body(registry, r, clock, ctx);
        experience::init_on_mint(&mut panda_obj, now_ms);
        strategy::init_on_mint(&mut panda_obj);
        trust_proof::init_on_mint(&mut panda_obj);
        achievement::init_on_mint(&mut panda_obj);
        panda::finish_mint(registry, panda_obj, ctx);
    }
}

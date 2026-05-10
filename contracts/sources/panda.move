/// Panda NFT — core module.
/// Personality five-axes are fixed at mint via sui::random.
/// Doc ref: docs/contract-design.md §2.1
module trading_panda::panda {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::random::{Self, Random};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ── Error codes ───────────────────────────────────────────────────────────
    const E_MINT_DISABLED: u64 = 0;
    const E_SUPPLY_EXCEEDED: u64 = 1;

    // ── Structs ───────────────────────────────────────────────────────────────

    public struct Panda has key, store {
        id: UID,
        boldness:    u8,    // 0–100 胆识
        patience:    u8,    // 0–100 耐性
        intuition:   u8,    // 0–100 直觉
        focus:       u8,    // 0–100 专注
        contrarian:  u8,    // 0–100 逆向性
        talent:      u8,    // 0=无, 1–6 稀有天赋
        mint_time:   u64,
        generation:  u64,
        is_trading:  bool,  // transfer lock
        created_at:  u64,
    }

    public struct AdminCap has key, store { id: UID }

    public struct MintEvent has copy, drop {
        panda_id:     address,
        minter:       address,
        boldness:     u8,
        patience:     u8,
        intuition:    u8,
        focus:        u8,
        contrarian:   u8,
        talent:       u8,
        generation:   u64,
        total_minted: u64,
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    // ── Entry functions ───────────────────────────────────────────────────────

    /// Mint a new Panda NFT with random personality.
    /// Requires: PandaRegistry (shared), Random (shared), Clock (shared).
    /// Caller pays ~0.03 SUI gas.
    entry fun mint(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(trading_panda::panda_registry::mint_enabled(registry), E_MINT_DISABLED);
        let total = trading_panda::panda_registry::total_minted(registry);
        assert!(total < trading_panda::panda_registry::max_supply(registry), E_SUPPLY_EXCEEDED);

        let mut gen = random::new_generator(r, ctx);

        // Five personality axes, each 0–100 inclusive
        let boldness   = random::generate_u8_in_range(&mut gen, 0, 100);
        let patience   = random::generate_u8_in_range(&mut gen, 0, 100);
        let intuition  = random::generate_u8_in_range(&mut gen, 0, 100);
        let focus      = random::generate_u8_in_range(&mut gen, 0, 100);
        let contrarian = random::generate_u8_in_range(&mut gen, 0, 100);

        // 15% chance of talent 1–6, else 0 (no talent)
        let talent_roll = random::generate_u8_in_range(&mut gen, 0, 99);
        let talent = if (talent_roll < 15) {
            random::generate_u8_in_range(&mut gen, 1, 6)
        } else {
            0u8
        };

        // Generation: 1–1000 mints = Gen 1, 1001–2000 = Gen 2, …
        let generation = total / 1000 + 1;
        let now_ms = clock::timestamp_ms(clock);

        let panda = Panda {
            id: object::new(ctx),
            boldness,
            patience,
            intuition,
            focus,
            contrarian,
            talent,
            mint_time: now_ms,
            generation,
            is_trading: false,
            created_at: now_ms,
        };

        let panda_addr = object::uid_to_address(&panda.id);
        let minter = tx_context::sender(ctx);

        event::emit(MintEvent {
            panda_id: panda_addr,
            minter,
            boldness,
            patience,
            intuition,
            focus,
            contrarian,
            talent,
            generation,
            total_minted: total + 1,
        });

        trading_panda::panda_registry::increment_minted(registry);
        transfer::transfer(panda, minter);
    }

    /// Lock/unlock trading — prevents transfer during simulation.
    public fun set_trading_lock(panda: &mut Panda, locked: bool) {
        panda.is_trading = locked;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public fun boldness(p: &Panda): u8    { p.boldness }
    public fun patience(p: &Panda): u8    { p.patience }
    public fun intuition(p: &Panda): u8   { p.intuition }
    public fun focus(p: &Panda): u8       { p.focus }
    public fun contrarian(p: &Panda): u8  { p.contrarian }
    public fun talent(p: &Panda): u8      { p.talent }
    public fun is_trading(p: &Panda): bool { p.is_trading }
    public fun generation(p: &Panda): u64 { p.generation }
}

module trading_panda::panda {
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::random::{Self, Random};
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_TRADING_IN_PROGRESS: u64 = 0;
    const E_MINT_DISABLED: u64 = 0;
    const E_MAX_SUPPLY_REACHED: u64 = 1;

    public struct Panda has key, store {
        id: UID,
        boldness: u8,
        patience: u8,
        intuition: u8,
        focus: u8,
        contrarian: u8,
        talent: u8,
        mint_time: u64,
        generation: u64,
        is_trading: bool,
        created_at: u64,
    }

    public struct AdminCap has key, store { id: UID }

    public struct MintEvent has copy, drop {
        panda_id: address,
        minter: address,
        boldness: u8,
        patience: u8,
        intuition: u8,
        focus: u8,
        contrarian: u8,
        talent: u8,
        generation: u64,
        total_minted: u64,
    }

    public struct PandaMinted has copy, drop {
        panda_id: ID,
        owner: address,
        boldness: u8,
        patience: u8,
        intuition: u8,
        focus: u8,
        contrarian: u8,
        talent: u8,
        generation: u64,
        timestamp: u64,
    }

    public struct PandaTransferred has copy, drop {
        panda_id: ID,
        from: address,
        to: address,
        timestamp: u64,
    }

    public struct PandaReset has copy, drop {
        panda_id: ID,
        owner: address,
        timestamp: u64,
    }

    public struct TradingLockChanged has copy, drop {
        panda_id: ID,
        locked: bool,
        timestamp: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    /// Mint a new Panda NFT with random personality.
    public entry fun mint(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        mint_internal(registry, r, clock, ctx)
    }

    /// Design-doc alias kept alongside `mint` for callers that use the spec name.
    public entry fun mint_panda(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        mint_internal(registry, r, clock, ctx)
    }

    fun mint_internal(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(trading_panda::panda_registry::mint_enabled(registry), E_MINT_DISABLED);
        let total = trading_panda::panda_registry::total_minted(registry);
        assert!(total < trading_panda::panda_registry::max_supply(registry), E_MAX_SUPPLY_REACHED);

        let mut gen = random::new_generator(r, ctx);

        let boldness   = random::generate_u8_in_range(&mut gen, 0, 100);
        let patience   = random::generate_u8_in_range(&mut gen, 0, 100);
        let intuition  = random::generate_u8_in_range(&mut gen, 0, 100);
        let focus      = random::generate_u8_in_range(&mut gen, 0, 100);
        let contrarian = random::generate_u8_in_range(&mut gen, 0, 100);

        let talent_roll = random::generate_u8_in_range(&mut gen, 1, 100);
        let talent = talent_from_roll(talent_roll);

        let generation = total + 1;
        let now_ms = clock::timestamp_ms(clock);

        let panda = Panda {
            id: object::new(ctx),
            boldness,
            patience,
            intuition,
            focus,
            contrarian,
            talent,
            mint_time: tx_context::epoch(ctx),
            generation,
            is_trading: false,
            created_at: now_ms,
        };

        let panda_addr = object::uid_to_address(&panda.id);
        let minter = tx_context::sender(ctx);

        event::emit(MintEvent { panda_id: panda_addr, minter, boldness, patience, intuition, focus, contrarian, talent, generation, total_minted: total + 1 });
        event::emit(PandaMinted { panda_id: object::id(&panda), owner: minter, boldness, patience, intuition, focus, contrarian, talent, generation, timestamp: now_ms });

        trading_panda::panda_registry::increment_minted(registry);
        transfer::transfer(panda, minter);
    }

    public entry fun lock_trading(panda: &mut Panda, _admin: &AdminCap, clock: &Clock) {
        panda.is_trading = true;
        event::emit(TradingLockChanged {
            panda_id: object::id(panda),
            locked: true,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    public entry fun unlock_trading(panda: &mut Panda, _admin: &AdminCap, clock: &Clock) {
        panda.is_trading = false;
        event::emit(TradingLockChanged {
            panda_id: object::id(panda),
            locked: false,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    public entry fun transfer_panda(
        panda: Panda,
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!panda.is_trading, E_TRADING_IN_PROGRESS);
        event::emit(PandaTransferred {
            panda_id: object::id(&panda),
            from: tx_context::sender(ctx),
            to: recipient,
            timestamp: clock::timestamp_ms(clock),
        });
        transfer::transfer(panda, recipient);
    }

    public entry fun reset_panda(panda: &Panda, clock: &Clock, ctx: &mut TxContext) {
        assert!(!panda.is_trading, E_TRADING_IN_PROGRESS);
        event::emit(PandaReset {
            panda_id: object::id(panda),
            owner: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    public entry fun set_max_supply(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        _admin: &AdminCap,
        new_max: u64,
    ) {
        trading_panda::panda_registry::set_max_supply_internal(registry, new_max);
    }

    public entry fun set_mint_enabled(
        registry: &mut trading_panda::panda_registry::PandaRegistry,
        _admin: &AdminCap,
        enabled: bool,
    ) {
        trading_panda::panda_registry::set_mint_enabled_internal(registry, enabled);
    }

    public fun boldness(p: &Panda): u8    { p.boldness }
    public fun patience(p: &Panda): u8    { p.patience }
    public fun intuition(p: &Panda): u8   { p.intuition }
    public fun focus(p: &Panda): u8       { p.focus }
    public fun contrarian(p: &Panda): u8  { p.contrarian }
    public fun talent(p: &Panda): u8      { p.talent }
    public fun is_trading(p: &Panda): bool { p.is_trading }
    public fun generation(p: &Panda): u64 { p.generation }
    public fun mint_time(p: &Panda): u64 { p.mint_time }
    public fun created_at(p: &Panda): u64 { p.created_at }
    public fun id(p: &Panda): ID { object::id(p) }

    public fun get_personality(p: &Panda): (u8, u8, u8, u8, u8) {
        (p.boldness, p.patience, p.intuition, p.focus, p.contrarian)
    }

    public(package) fun uid(p: &Panda): &UID { &p.id }
    public(package) fun uid_mut(p: &mut Panda): &mut UID { &mut p.id }

    fun talent_from_roll(roll: u8): u8 {
        if (roll <= 2) {
            1
        } else if (roll <= 5) {
            2
        } else if (roll <= 7) {
            3
        } else if (roll <= 11) {
            4
        } else if (roll <= 12) {
            5
        } else if (roll <= 15) {
            6
        } else {
            0
        }
    }

    #[test_only]
    public fun new_admin_for_testing(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }

    #[test_only]
    public fun new_for_testing(
        boldness: u8,
        patience: u8,
        intuition: u8,
        focus: u8,
        contrarian: u8,
        talent: u8,
        generation: u64,
        ctx: &mut TxContext,
    ): Panda {
        Panda {
            id: object::new(ctx),
            boldness,
            patience,
            intuition,
            focus,
            contrarian,
            talent,
            mint_time: tx_context::epoch(ctx),
            generation,
            is_trading: false,
            created_at: 0,
        }
    }

    #[test_only]
    public fun destroy_for_testing(panda: Panda) {
        let Panda { id, boldness: _, patience: _, intuition: _, focus: _, contrarian: _, talent: _, mint_time: _, generation: _, is_trading: _, created_at: _ } = panda;
        object::delete(id);
    }

    #[test_only]
    public fun destroy_admin_for_testing(admin: AdminCap) {
        let AdminCap { id } = admin;
        object::delete(id);
    }
}

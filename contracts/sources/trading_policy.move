/// Standalone shared TradingPolicy — owner-gated risk collar for Panda agents.
module trading_panda::trading_policy {
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use trading_panda::panda::{Self as panda_nft, Panda};

    const MODE_TRAINING_LEDGER: u8 = 1;
    const MODE_PANDA_COIN_DEMO: u8 = 2;

    const E_NOT_OWNER: u64 = 100;
    const E_NOT_AGENT: u64 = 101;
    const E_PAUSED: u64 = 102;
    const E_EXPIRED: u64 = 103;
    const E_PAIR_NOT_ALLOWED: u64 = 104;
    const E_NOTIONAL_TOO_LARGE: u64 = 105;
    const E_DAILY_LOSS_EXCEEDED: u64 = 106;
    const E_POLICY_LOOSEN: u64 = 107;
    const E_AGENT_REVOKED: u64 = 108;
    const E_VERSION_STALE: u64 = 109;
    const E_PANDA_MISMATCH: u64 = 110;

    public struct TradingPolicy has key, store {
        id: UID,
        panda_id: ID,
        owner: address,
        authorized_agent: address,
        mode: u8,
        allowed_pairs_hash: vector<u8>,
        max_notional_per_trade: u64,
        max_daily_loss: u64,
        max_leverage_bps: u64,
        max_open_positions: u64,
        cooldown_ms: u64,
        max_proofs_per_day: u64,
        expires_at_ms: u64,
        paused: bool,
        agent_revoked: bool,
        version: u64,
        policy_hash: vector<u8>,
        created_at_ms: u64,
        updated_at_ms: u64,
    }

    public struct TradingPolicyCreated has copy, drop {
        policy_id: ID,
        panda_id: ID,
        owner: address,
        authorized_agent: address,
        version: u64,
        policy_hash: vector<u8>,
        timestamp_ms: u64,
    }

    public struct TradingPolicyUpdated has copy, drop {
        policy_id: ID,
        panda_id: ID,
        version: u64,
        policy_hash: vector<u8>,
        timestamp_ms: u64,
    }

    public struct TradingPolicyPaused has copy, drop {
        policy_id: ID,
        panda_id: ID,
        paused: bool,
        timestamp_ms: u64,
    }

    public struct AgentRevoked has copy, drop {
        policy_id: ID,
        panda_id: ID,
        old_agent: address,
        timestamp_ms: u64,
    }

    public(package) fun create_policy_inner(
        panda: &Panda,
        authorized_agent: address,
        mode: u8,
        allowed_pairs_hash: vector<u8>,
        max_notional_per_trade: u64,
        max_daily_loss: u64,
        max_leverage_bps: u64,
        max_open_positions: u64,
        cooldown_ms: u64,
        max_proofs_per_day: u64,
        expires_at_ms: u64,
        policy_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): TradingPolicy {
        let owner = tx_context::sender(ctx);
        let now_ms = clock::timestamp_ms(clock);
        let policy = TradingPolicy {
            id: object::new(ctx),
            panda_id: panda_nft::id(panda),
            owner,
            authorized_agent,
            mode,
            allowed_pairs_hash,
            max_notional_per_trade,
            max_daily_loss,
            max_leverage_bps,
            max_open_positions,
            cooldown_ms,
            max_proofs_per_day,
            expires_at_ms,
            paused: false,
            agent_revoked: false,
            version: 1,
            policy_hash,
            created_at_ms: now_ms,
            updated_at_ms: now_ms,
        };
        event::emit(TradingPolicyCreated {
            policy_id: object::id(&policy),
            panda_id: panda_nft::id(panda),
            owner,
            authorized_agent,
            version: 1,
            policy_hash: policy.policy_hash,
            timestamp_ms: now_ms,
        });
        policy
    }

    public fun share_policy(policy: TradingPolicy) {
        transfer::share_object(policy);
    }

    public entry fun tighten_policy(
        policy: &mut TradingPolicy,
        allowed_pairs_hash: vector<u8>,
        max_notional_per_trade: u64,
        max_daily_loss: u64,
        max_leverage_bps: u64,
        max_open_positions: u64,
        cooldown_ms: u64,
        max_proofs_per_day: u64,
        policy_hash: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        update_policy(
            policy,
            allowed_pairs_hash,
            max_notional_per_trade,
            max_daily_loss,
            max_leverage_bps,
            max_open_positions,
            cooldown_ms,
            max_proofs_per_day,
            policy_hash,
            clock,
            ctx,
        );
    }

    public entry fun update_policy(
        policy: &mut TradingPolicy,
        allowed_pairs_hash: vector<u8>,
        max_notional_per_trade: u64,
        max_daily_loss: u64,
        max_leverage_bps: u64,
        max_open_positions: u64,
        cooldown_ms: u64,
        max_proofs_per_day: u64,
        policy_hash: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert_owner(policy, ctx);
        assert!(
            max_notional_per_trade <= policy.max_notional_per_trade,
            E_POLICY_LOOSEN,
        );
        assert!(max_daily_loss <= policy.max_daily_loss, E_POLICY_LOOSEN);
        let now_ms = clock::timestamp_ms(clock);
        policy.allowed_pairs_hash = allowed_pairs_hash;
        policy.max_notional_per_trade = max_notional_per_trade;
        policy.max_daily_loss = max_daily_loss;
        policy.max_leverage_bps = max_leverage_bps;
        policy.max_open_positions = max_open_positions;
        policy.cooldown_ms = cooldown_ms;
        policy.max_proofs_per_day = max_proofs_per_day;
        policy.policy_hash = policy_hash;
        policy.version = policy.version + 1;
        policy.updated_at_ms = now_ms;
        event::emit(TradingPolicyUpdated {
            policy_id: object::id(policy),
            panda_id: policy.panda_id,
            version: policy.version,
            policy_hash: policy.policy_hash,
            timestamp_ms: now_ms,
        });
    }

    public entry fun pause_policy(
        policy: &mut TradingPolicy,
        paused: bool,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert_owner(policy, ctx);
        policy.paused = paused;
        let now_ms = clock::timestamp_ms(clock);
        policy.updated_at_ms = now_ms;
        event::emit(TradingPolicyPaused {
            policy_id: object::id(policy),
            panda_id: policy.panda_id,
            paused,
            timestamp_ms: now_ms,
        });
    }

    public entry fun revoke_agent(policy: &mut TradingPolicy, clock: &Clock, ctx: &TxContext) {
        assert_owner(policy, ctx);
        let old_agent = policy.authorized_agent;
        policy.authorized_agent = @0x0;
        policy.agent_revoked = true;
        policy.paused = true;
        let now_ms = clock::timestamp_ms(clock);
        policy.updated_at_ms = now_ms;
        event::emit(AgentRevoked {
            policy_id: object::id(policy),
            panda_id: policy.panda_id,
            old_agent,
            timestamp_ms: now_ms,
        });
    }

    public fun assert_owner(policy: &TradingPolicy, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == policy.owner, E_NOT_OWNER);
    }

    public fun assert_agent(policy: &TradingPolicy, ctx: &TxContext) {
        assert!(!policy.agent_revoked, E_AGENT_REVOKED);
        assert!(tx_context::sender(ctx) == policy.authorized_agent, E_NOT_AGENT);
    }

    public fun assert_active(policy: &TradingPolicy, clock: &Clock) {
        assert!(!policy.paused, E_PAUSED);
        assert!(!policy.agent_revoked, E_AGENT_REVOKED);
        let now_ms = clock::timestamp_ms(clock);
        assert!(policy.expires_at_ms == 0 || now_ms < policy.expires_at_ms, E_EXPIRED);
    }

    public fun assert_version(policy: &TradingPolicy, expected_version: u64) {
        assert!(policy.version == expected_version, E_VERSION_STALE);
    }

    public fun assert_panda_match(policy: &TradingPolicy, panda_id: ID) {
        assert!(policy.panda_id == panda_id, E_PANDA_MISMATCH);
    }

    public fun assert_trade_allowed(
        policy: &TradingPolicy,
        pair_hash: vector<u8>,
        notional: u64,
        current_daily_loss: u64,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert_agent(policy, ctx);
        assert_active(policy, clock);
        assert!(pair_hash == policy.allowed_pairs_hash, E_PAIR_NOT_ALLOWED);
        assert!(notional <= policy.max_notional_per_trade, E_NOTIONAL_TOO_LARGE);
        assert!(current_daily_loss <= policy.max_daily_loss, E_DAILY_LOSS_EXCEEDED);
    }

    public fun id(policy: &TradingPolicy): ID { object::id(policy) }
    public fun panda_id(policy: &TradingPolicy): ID { policy.panda_id }
    public fun owner(policy: &TradingPolicy): address { policy.owner }
    public fun authorized_agent(policy: &TradingPolicy): address { policy.authorized_agent }
    public fun version(policy: &TradingPolicy): u64 { policy.version }
    public fun paused(policy: &TradingPolicy): bool { policy.paused }
    public fun agent_revoked(policy: &TradingPolicy): bool { policy.agent_revoked }
    public fun max_notional(policy: &TradingPolicy): u64 { policy.max_notional_per_trade }
    public fun mode(policy: &TradingPolicy): u8 { policy.mode }

    #[test_only]
    public fun new_for_testing(
        panda_id: ID,
        owner: address,
        authorized_agent: address,
        allowed_pairs_hash: vector<u8>,
        max_notional: u64,
        max_daily_loss: u64,
        ctx: &mut TxContext,
    ): TradingPolicy {
        TradingPolicy {
            id: object::new(ctx),
            panda_id,
            owner,
            authorized_agent,
            mode: MODE_TRAINING_LEDGER,
            allowed_pairs_hash,
            max_notional_per_trade: max_notional,
            max_daily_loss,
            max_leverage_bps: 10_000,
            max_open_positions: 1,
            cooldown_ms: 0,
            max_proofs_per_day: 10,
            expires_at_ms: 0,
            paused: false,
            agent_revoked: false,
            version: 1,
            policy_hash: vector[1, 2, 3],
            created_at_ms: 0,
            updated_at_ms: 0,
        }
    }

    #[test_only]
    public fun destroy_for_testing(policy: TradingPolicy) {
        let TradingPolicy {
            id,
            panda_id: _,
            owner: _,
            authorized_agent: _,
            mode: _,
            allowed_pairs_hash: _,
            max_notional_per_trade: _,
            max_daily_loss: _,
            max_leverage_bps: _,
            max_open_positions: _,
            cooldown_ms: _,
            max_proofs_per_day: _,
            expires_at_ms: _,
            paused: _,
            agent_revoked: _,
            version: _,
            policy_hash: _,
            created_at_ms: _,
            updated_at_ms: _,
        } = policy;
        object::delete(id);
    }
}

/// One-transaction Agent Wallet setup: TradingPolicy + PandaVault.
module trading_panda::agent_wallet {
    use sui::clock::Clock;
    use sui::tx_context::TxContext;
    use trading_panda::panda::{Self as panda_nft, Panda};
    use trading_panda::panda_vault::{Self};
    use trading_panda::trading_policy::{Self};

    /// Create standalone shared TradingPolicy and shared PandaVault for a minted Panda.
    public entry fun setup_agent_wallet(
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
    ) {
        let policy = trading_policy::create_policy_inner(
            panda,
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
            policy_hash,
            clock,
            ctx,
        );
        let vault = panda_vault::create_vault_inner(panda, &policy, mode, clock, ctx);
        trading_policy::share_policy(policy);
        panda_vault::share_vault(vault);
    }
}

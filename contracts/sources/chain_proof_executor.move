/// Mode 2 chain proof — policy-checked proof path (not real trade execution).
module trading_panda::chain_proof_executor {
    use sui::clock::Clock;
    use sui::event;
    use sui::object::ID;
    use sui::tx_context::{Self, TxContext};
    use trading_panda::panda_vault::{Self, PandaVault};
    use trading_panda::trading_policy::{Self, TradingPolicy};

    const SIDE_BUY: u8 = 1;
    const SIDE_SELL: u8 = 2;

    public struct ChainProofRecorded has copy, drop {
        vault_id: ID,
        policy_id: ID,
        panda_id: ID,
        agent: address,
        trade_fact_id_hash: vector<u8>,
        pair_hash: vector<u8>,
        side: u8,
        notional: u64,
        reference_price: u64,
        decision_hash: vector<u8>,
        proof_key_hash: vector<u8>,
        proof_source: u8,
        policy_version: u64,
        timestamp_ms: u64,
    }

    public entry fun submit_chain_proof(
        vault: &mut PandaVault,
        policy: &TradingPolicy,
        pair_hash: vector<u8>,
        side: u8,
        notional: u64,
        reference_price: u64,
        decision_hash: vector<u8>,
        proof_key_hash: vector<u8>,
        trade_fact_id_hash: vector<u8>,
        proof_source: u8,
        policy_version: u64,
        current_daily_loss: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        panda_vault::assert_bindings(vault, policy, policy_version);
        trading_policy::assert_trade_allowed(
            policy,
            pair_hash,
            notional,
            current_daily_loss,
            clock,
            ctx,
        );
        let _ = reference_price;
        let _ = side;
        assert!(side == SIDE_BUY || side == SIDE_SELL, 0);

        event::emit(ChainProofRecorded {
            vault_id: panda_vault::id(vault),
            policy_id: trading_policy::id(policy),
            panda_id: panda_vault::panda_id(vault),
            agent: tx_context::sender(ctx),
            trade_fact_id_hash,
            pair_hash,
            side,
            notional,
            reference_price,
            decision_hash,
            proof_key_hash,
            proof_source,
            policy_version,
            timestamp_ms: sui::clock::timestamp_ms(clock),
        });
    }
}

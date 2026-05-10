/// Merkle Root submission — on-chain trust proof for decision logs.
/// Each batch of MERKLE_BATCH_SIZE trades gets one Merkle Root submitted.
/// Doc ref: docs/PRD.md §11, docs/contract-design.md §trust_proof
module trading_panda::trust_proof {
    use sui::dynamic_field;
    use sui::object::UID;
    use sui::event;

    public struct MerkleEntry has store, drop {
        root_hash: vector<u8>,
        trade_count: u64,
        submitted_at: u64,
    }

    public struct MerkleRootSubmitted has copy, drop {
        panda_id: address,
        root_hash: vector<u8>,
        trade_count: u64,
        timestamp: u64,
    }

    public fun submit_merkle_root(
        panda_id: &mut UID,
        panda_addr: address,
        root_hash: vector<u8>,
        trade_count: u64,
        timestamp: u64,
        batch_index: u64,
    ) {
        let key = batch_index;
        let entry = MerkleEntry { root_hash, trade_count, submitted_at: timestamp };
        dynamic_field::add(panda_id, key, entry);
        event::emit(MerkleRootSubmitted {
            panda_id: panda_addr,
            root_hash,
            trade_count,
            timestamp,
        });
    }
}

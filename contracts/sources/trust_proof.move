module trading_panda::trust_proof {
    use std::hash;
    use sui::dynamic_field;
    use sui::event;
    use sui::object::{Self, ID};
    use sui::clock::{Self, Clock};
    use sui::tx_context::TxContext;
    use trading_panda::panda::{Self, AdminCap, Panda};

    const E_INVALID_ROOT: u64 = 40;
    const E_TRADE_COUNT_MISMATCH: u64 = 41;
    const MERKLE_ROOT_LENGTH: u64 = 32;

    public struct MerkleProof has store, drop {
        root_hash: vector<u8>,
        trade_count: u64,
        start_trade_id: u64,
        end_trade_id: u64,
        timestamp: u64,
    }

    public struct TrustProofIndex has store, drop {
        count: u64,
        total_verified_trades: u64,
    }

    public struct TrustProofKey has copy, drop, store {
        batch_index: u64,
    }

    public struct MerkleRootSubmitted has copy, drop {
        panda_id: ID,
        root_hash: vector<u8>,
        trade_count: u64,
        batch_index: u64,
        timestamp: u64,
    }

    public struct SkillDigestProof has store, drop {
        skill_version: u64,
        skill_hash: vector<u8>,
        timestamp: u64,
    }

    public struct SkillDigestKey has copy, drop, store {
        skill_version: u64,
    }

    public struct SkillDigestSubmitted has copy, drop {
        panda_id: ID,
        skill_version: u64,
        skill_hash: vector<u8>,
        timestamp: u64,
    }

    const KEY_INDEX: vector<u8> = b"trust_proofs";
    const KEY_SKILL_INDEX: vector<u8> = b"skill_digests";
    const E_ALREADY_INITIALIZED: u64 = 42;

    /// Trust proof index at mint (batch proofs added on submit).
    public(package) fun init_on_mint(panda: &mut Panda) {
        assert!(!dynamic_field::exists(panda::uid(panda), KEY_INDEX), E_ALREADY_INITIALIZED);
        dynamic_field::add(panda::uid_mut(panda), KEY_INDEX, TrustProofIndex {
            count: 0,
            total_verified_trades: 0,
        });
    }

    public fun has_proof_index(panda: &Panda): bool {
        dynamic_field::exists(panda::uid(panda), KEY_INDEX)
    }

    public entry fun submit_merkle_root(
        panda: &mut Panda,
        _admin: &AdminCap,
        root_hash: vector<u8>,
        trade_count: u64,
        start_trade_id: u64,
        end_trade_id: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(vector::length(&root_hash) == MERKLE_ROOT_LENGTH, E_INVALID_ROOT);
        assert!(trade_count > 0 && end_trade_id + 1 - start_trade_id == trade_count, E_TRADE_COUNT_MISMATCH);

        let timestamp = clock::timestamp_ms(clock);
        if (!dynamic_field::exists(panda::uid(panda), KEY_INDEX)) {
            dynamic_field::add(panda::uid_mut(panda), KEY_INDEX, TrustProofIndex { count: 0, total_verified_trades: 0 });
        };

        let batch_index = {
            let index_ref: &TrustProofIndex = dynamic_field::borrow(panda::uid(panda), KEY_INDEX);
            index_ref.count
        };
        dynamic_field::add(panda::uid_mut(panda), TrustProofKey { batch_index }, MerkleProof {
            root_hash,
            trade_count,
            start_trade_id,
            end_trade_id,
            timestamp,
        });

        let index_ref: &mut TrustProofIndex = dynamic_field::borrow_mut(panda::uid_mut(panda), KEY_INDEX);
        index_ref.count = index_ref.count + 1;
        index_ref.total_verified_trades = index_ref.total_verified_trades + trade_count;

        event::emit(MerkleRootSubmitted {
            panda_id: object::id(panda),
            root_hash,
            trade_count,
            batch_index,
            timestamp,
        });
    }

    public entry fun submit_skill_digest(
        panda: &mut Panda,
        _admin: &AdminCap,
        skill_version: u64,
        skill_hash: vector<u8>,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(vector::length(&skill_hash) == MERKLE_ROOT_LENGTH, E_INVALID_ROOT);
        assert!(skill_version > 0, E_TRADE_COUNT_MISMATCH);

        let timestamp = clock::timestamp_ms(clock);
        let key = SkillDigestKey { skill_version };
        if (dynamic_field::exists(panda::uid(panda), key)) {
            let _old: SkillDigestProof = dynamic_field::remove(panda::uid_mut(panda), key);
        };
        dynamic_field::add(panda::uid_mut(panda), key, SkillDigestProof {
            skill_version,
            skill_hash,
            timestamp,
        });

        if (!dynamic_field::exists(panda::uid(panda), KEY_SKILL_INDEX)) {
            dynamic_field::add(panda::uid_mut(panda), KEY_SKILL_INDEX, TrustProofIndex {
                count: 0,
                total_verified_trades: 0,
            });
        };
        let index_ref: &mut TrustProofIndex = dynamic_field::borrow_mut(panda::uid_mut(panda), KEY_SKILL_INDEX);
        index_ref.count = index_ref.count + 1;

        event::emit(SkillDigestSubmitted {
            panda_id: object::id(panda),
            skill_version,
            skill_hash,
            timestamp,
        });
    }

    public fun has_skill_digest(panda: &Panda, skill_version: u64): bool {
        dynamic_field::exists(panda::uid(panda), SkillDigestKey { skill_version })
    }

    public fun get_skill_digest(panda: &Panda, skill_version: u64): &SkillDigestProof {
        dynamic_field::borrow(panda::uid(panda), SkillDigestKey { skill_version })
    }

    public fun skill_hash(proof: &SkillDigestProof): vector<u8> { proof.skill_hash }
    public fun skill_version(proof: &SkillDigestProof): u64 { proof.skill_version }

    public fun get_latest_proof_index(panda: &Panda): (u64, u64) {
        if (dynamic_field::exists(panda::uid(panda), KEY_INDEX)) {
            let index_ref: &TrustProofIndex = dynamic_field::borrow(panda::uid(panda), KEY_INDEX);
            (index_ref.count, index_ref.total_verified_trades)
        } else {
            (0, 0)
        }
    }

    public fun get_proof(panda: &Panda, batch_index: u64): &MerkleProof {
        dynamic_field::borrow(panda::uid(panda), TrustProofKey { batch_index })
    }

    public fun verify_trade_log(
        panda: &Panda,
        batch_index: u64,
        leaf_hash: vector<u8>,
        proof: vector<vector<u8>>,
        leaf_index: u64,
    ): bool {
        let merkle_proof: &MerkleProof = dynamic_field::borrow(panda::uid(panda), TrustProofKey { batch_index });
        compute_merkle_root(leaf_hash, proof, leaf_index) == merkle_proof.root_hash
    }

    public fun root_hash(proof: &MerkleProof): vector<u8> { proof.root_hash }
    public fun trade_count(proof: &MerkleProof): u64 { proof.trade_count }

    public fun compute_merkle_root(
        leaf: vector<u8>,
        mut proof: vector<vector<u8>>,
        mut index: u64,
    ): vector<u8> {
        let mut current = leaf;
        while (!vector::is_empty(&proof)) {
            let sibling = vector::remove(&mut proof, 0);
            current = if (index % 2 == 0) {
                hash_pair(current, sibling)
            } else {
                hash_pair(sibling, current)
            };
            index = index / 2;
        };
        current
    }

    fun hash_pair(left: vector<u8>, right: vector<u8>): vector<u8> {
        let mut bytes = left;
        vector::append(&mut bytes, right);
        hash::sha2_256(bytes)
    }
}

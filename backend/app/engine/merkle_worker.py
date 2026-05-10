"""Merkle Root Worker — batches every MERKLE_BATCH_SIZE trades, submits to Sui.

Flow:
  1. Collect trade IDs since last root
  2. Hash each trade record (SHA-256)
  3. Build Merkle tree
  4. Submit root_hash to Sui contract via trust_proof module
  5. Update merkle_roots table (chain_status: pending→confirmed)

Doc ref: docs/PRD.md §11 (Trust Model), docs/database-schema.md §3.12
"""
import hashlib
from typing import List


def compute_merkle_root(leaves: List[str]) -> str:
    """Build a Merkle root from a list of hex-encoded leaf hashes."""
    if not leaves:
        return hashlib.sha256(b"").hexdigest()

    nodes = [bytes.fromhex(leaf) for leaf in leaves]

    while len(nodes) > 1:
        if len(nodes) % 2 == 1:
            nodes.append(nodes[-1])  # duplicate last node if odd
        nodes = [
            hashlib.sha256(nodes[i] + nodes[i + 1]).digest()
            for i in range(0, len(nodes), 2)
        ]

    return nodes[0].hex()


async def submit_merkle_root(panda_id: str, root_hash: str, trade_ids: List[str]) -> None:
    """Submit Merkle root to Sui chain via pysui."""
    # TODO: build Move call to trust_proof::submit_merkle_root(...)
    # TODO: update merkle_roots table chain_status = 'submitted'
    pass

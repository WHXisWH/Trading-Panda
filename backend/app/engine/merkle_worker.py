"""Merkle Root Worker — batches every MERKLE_BATCH_SIZE trades.

Flow:
  1. Collect this batch's trade records
  2. Hash each trade record into a leaf (SHA-256)
  3. Build the Merkle tree → root_hash
  4. Persist a merkle_roots row (off-chain, this module)
  5. Submit root_hash to Sui trust_proof contract (deferred — see stub)

Doc ref: docs/PRD.md §11 (Trust Model), docs/database-schema.md §3.12
"""
from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any, List

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


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


def trade_leaf(trade: dict[str, Any]) -> str:
    """Deterministic SHA-256 leaf for one trade record."""
    canonical = json.dumps(
        {
            "id": str(trade.get("id", "")),
            "action": trade.get("action"),
            "price": str(trade.get("price")),
            "quantity": str(trade.get("quantity")),
            "final_score": str(trade.get("final_score")),
            "pnl_pct": str(trade.get("pnl_pct")),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def build_leaves(trades: list[dict[str, Any]]) -> list[str]:
    return [trade_leaf(t) for t in trades]


async def persist_merkle_batch(
    session: "AsyncSession",
    panda_id: str,
    batch_index: int,
    trades: list[dict[str, Any]],
) -> str:
    """Compute the batch root from `trades` and insert a merkle_roots row.

    Returns the root hash. The on-chain submission is left to
    `submit_merkle_root` (deferred).
    """
    from app.db.models import MerkleRoot

    leaves = build_leaves(trades)
    root = compute_merkle_root(leaves)
    session.add(
        MerkleRoot(
            panda_id=panda_id,
            root_hash=root,
            trade_count=len(leaves),
            batch_index=batch_index,
        )
    )
    return root


async def submit_merkle_root(panda_id: str, root_hash: str, trade_ids: List[str]) -> None:
    """Submit Merkle root to Sui chain via pysui (contract step — deferred)."""
    # TODO(contract): build Move call to trust_proof::submit_merkle_root(...)
    # TODO(contract): update merkle_roots.sui_tx_digest on confirmation
    pass

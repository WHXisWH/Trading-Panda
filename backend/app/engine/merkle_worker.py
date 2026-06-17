"""Merkle Root helpers — canonical Trade Fact leaves and batch roots (Epic 9).

Flow:
  1. Hash each Trade Fact into a deterministic leaf (fact_hash preferred)
  2. Build Merkle tree → root_hash
  3. Persist merkle_roots row (async worker handles chain submit)

Doc ref: docs/PRD.md §11, docs/database-schema.md §4.2
"""
from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


def compute_merkle_root(leaves: list[str]) -> str:
    """Build a Merkle root from a list of hex-encoded leaf hashes."""
    if not leaves:
        return hashlib.sha256(b"").hexdigest()

    nodes = [bytes.fromhex(leaf) for leaf in leaves]

    while len(nodes) > 1:
        if len(nodes) % 2 == 1:
            nodes.append(nodes[-1])
        nodes = [
            hashlib.sha256(nodes[i] + nodes[i + 1]).digest()
            for i in range(0, len(nodes), 2)
        ]

    return nodes[0].hex()


def trade_fact_leaf(fact: dict[str, Any]) -> str:
    """Deterministic SHA-256 leaf for one canonical Trade Fact."""
    fact_hash = fact.get("fact_hash")
    if isinstance(fact_hash, str) and len(fact_hash) == 64:
        return fact_hash.lower()

    canonical = json.dumps(
        {
            "id": str(fact.get("id", "")),
            "fact_hash": fact.get("fact_hash"),
            "pair": fact.get("pair"),
            "side": fact.get("side"),
            "decision_hash": fact.get("decision_hash"),
            "final_score": str(
                (fact.get("decision_snapshot") or {}).get("final_score")
                or fact.get("final_score")
            ),
            "reference_price": str(
                (fact.get("execution_snapshot") or {}).get("reference_price")
            ),
            "quantity": str((fact.get("execution_snapshot") or {}).get("quantity")),
            "realized_pnl": str(fact.get("realized_pnl")),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def build_leaves_from_facts(facts: list[dict[str, Any]]) -> list[str]:
    return [trade_fact_leaf(f) for f in facts]


# Backward-compatible alias for legacy tests
trade_leaf = trade_fact_leaf
build_leaves = build_leaves_from_facts


async def persist_merkle_batch(
    session: "AsyncSession",
    *,
    panda_id: str,
    batch_index: int,
    facts: list[dict[str, Any]],
    start_fact_id: str | None = None,
    end_fact_id: str | None = None,
) -> str:
    """Compute batch root from Trade Facts and insert a merkle_roots row."""
    from app.db.models import MerkleRoot

    leaves = build_leaves_from_facts(facts)
    root = compute_merkle_root(leaves)
    session.add(
        MerkleRoot(
            panda_id=panda_id,
            root_hash=root,
            trade_count=len(leaves),
            batch_index=batch_index,
            root_type="trade_facts",
            start_fact_id=start_fact_id,
            end_fact_id=end_fact_id,
        )
    )
    return root

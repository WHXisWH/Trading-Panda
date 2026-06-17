"""Merkle leaf/root logic — DB-free."""
import hashlib

from app.engine.merkle_worker import build_leaves, compute_merkle_root, trade_leaf


def test_empty_root_is_sha256_of_empty():
    assert compute_merkle_root([]) == hashlib.sha256(b"").hexdigest()


def test_single_leaf_root_is_the_leaf():
    leaf = hashlib.sha256(b"x").hexdigest()
    assert compute_merkle_root([leaf]) == leaf


def test_two_leaf_root():
    a = hashlib.sha256(b"a").hexdigest()
    b = hashlib.sha256(b"b").hexdigest()
    expected = hashlib.sha256(bytes.fromhex(a) + bytes.fromhex(b)).hexdigest()
    assert compute_merkle_root([a, b]) == expected


def test_odd_leaves_duplicate_last():
    a = hashlib.sha256(b"a").hexdigest()
    b = hashlib.sha256(b"b").hexdigest()
    c = hashlib.sha256(b"c").hexdigest()
    # level1: H(a,b), H(c,c) ; root: H(of those)
    h_ab = hashlib.sha256(bytes.fromhex(a) + bytes.fromhex(b)).digest()
    h_cc = hashlib.sha256(bytes.fromhex(c) + bytes.fromhex(c)).digest()
    expected = hashlib.sha256(h_ab + h_cc).hexdigest()
    assert compute_merkle_root([a, b, c]) == expected


def test_trade_leaf_is_deterministic():
    t = {"id": "1", "action": "BUY", "price": 100, "quantity": 2, "final_score": 0.7, "pnl_pct": 0.1}
    assert trade_leaf(t) == trade_leaf(dict(t))


def test_trade_leaf_changes_with_content():
    t1 = {
        "id": "1",
        "pair": "DEEP/SUI",
        "side": "BUY",
        "fact_hash": hashlib.sha256(b"buy").hexdigest(),
    }
    t2 = {
        "id": "1",
        "pair": "DEEP/SUI",
        "side": "SELL",
        "fact_hash": hashlib.sha256(b"sell").hexdigest(),
    }
    assert trade_leaf(t1) != trade_leaf(t2)


def test_build_leaves_length():
    trades = [{"id": str(i), "fact_hash": hashlib.sha256(str(i).encode()).hexdigest()} for i in range(5)]
    assert len(build_leaves(trades)) == 5
    root = compute_merkle_root(build_leaves([{"id": str(i), "fact_hash": hashlib.sha256(str(i).encode()).hexdigest()} for i in range(50)]))
    assert len(root) == 64


def test_trade_fact_leaf_alias():
    fact_hash = hashlib.sha256(b"fact").hexdigest()
    fact = {"fact_hash": fact_hash}
    assert trade_leaf(fact) == fact_hash

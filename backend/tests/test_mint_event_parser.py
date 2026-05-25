"""Mint event parsing — Epic 1.1 contract tests."""

import pytest

from app.services.mint_event_parser import ParsedMintEvent, parse_mint_events_from_tx

PKG = "0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465"


def _panda_minted_event(**fields: object) -> dict:
    base = {
        "panda_id": "0xabc123",
        "owner": "0xowner",
        "boldness": 72,
        "patience": 45,
        "intuition": 88,
        "focus": 61,
        "contrarian": 33,
        "talent": 5,
        "generation": 42,
        "timestamp": 1_700_000_000_000,
    }
    base.update(fields)
    return {
        "type": f"{PKG}::panda::PandaMinted",
        "parsedJson": base,
    }


def test_parse_panda_minted_event():
    parsed = parse_mint_events_from_tx([_panda_minted_event()], PKG)
    assert parsed is not None
    assert parsed.object_id == "0xabc123"
    assert parsed.boldness == 72
    assert parsed.talent == 5
    assert parsed.generation == 42
    assert parsed.minter == "0xowner"


def test_parse_mint_event_fallback():
    events = [
        {
            "type": f"{PKG}::panda::MintEvent",
            "parsedJson": {
                "panda_id": "0xdeadbeef",
                "minter": "0xminter",
                "boldness": 10,
                "patience": 20,
                "intuition": 30,
                "focus": 40,
                "contrarian": 50,
                "talent": 0,
                "generation": 1,
                "total_minted": 1,
            },
        }
    ]
    parsed = parse_mint_events_from_tx(events, PKG)
    assert parsed == ParsedMintEvent(
        object_id="0xdeadbeef",
        boldness=10,
        patience=20,
        intuition=30,
        focus=40,
        contrarian=50,
        talent=0,
        generation=1,
        minter="0xminter",
    )


def test_parse_prefers_panda_minted_over_mint_event():
    events = [
        {
            "type": f"{PKG}::panda::MintEvent",
            "parsedJson": {
                "panda_id": "0xwrong",
                "minter": "0xa",
                "boldness": 1,
                "patience": 1,
                "intuition": 1,
                "focus": 1,
                "contrarian": 1,
                "talent": 0,
                "generation": 1,
                "total_minted": 1,
            },
        },
        _panda_minted_event(),
    ]
    parsed = parse_mint_events_from_tx(events, PKG)
    assert parsed is not None
    assert parsed.object_id == "0xabc123"
    assert parsed.boldness == 72


def test_parse_returns_none_for_unrelated_events():
    assert parse_mint_events_from_tx([{"type": "0x1::foo::Bar", "parsedJson": {}}], PKG) is None

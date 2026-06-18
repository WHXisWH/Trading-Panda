"""Tests for Agent Wallet tx event parsing."""

import pytest

from app.services.agent_wallet_event_parser import fetch_setup_from_tx, parse_setup_from_tx

PUBLISHED_PKG = "0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339"
V2_EVENT_PKG = "0x9e8a64e122e6a1486f169bfca2ac9ff5aff28da29ebea53e8b6c56e101d95262"
PANDA_ID = "0x1111111111111111111111111111111111111111111111111111111111111111"
VAULT_ID = "0x2222222222222222222222222222222222222222222222222222222222222222"
POLICY_ID = "0x3333333333333333333333333333333333333333333333333333333333333333"
OWNER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
AGENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

REAL_SETUP_TX = "2wpy85Li8hPLh1hdjXJmh5njt5xLrsvZMNyBG4Q9NXo9"
REAL_POLICY_ID = "0x2648853f5b5fb3887a9f49500ed6812c845d797eb621d7d1152cf2650537b18d"
REAL_PANDA_ID = "0x3e0f24e4e2eb75a8fa1f58433cd87a0d24691a2e7f4d55740486563455b20b51"
REAL_VAULT_ID = "0x4de1375c4953441e647adf9bdfeae706ede3fa1c53e55daa3a735c955166bf6c"


def test_parse_setup_from_tx_matches_published_at_events():
    events = [
        {
            "type": f"{PUBLISHED_PKG}::panda_vault::PandaVaultCreated",
            "parsedJson": {
                "vault_id": VAULT_ID,
                "panda_id": PANDA_ID,
                "owner": OWNER,
                "policy_id": POLICY_ID,
                "authorized_agent": AGENT,
            },
        },
        {
            "type": f"{PUBLISHED_PKG}::trading_policy::TradingPolicyCreated",
            "parsedJson": {
                "policy_id": POLICY_ID,
                "panda_id": PANDA_ID,
                "owner": OWNER,
                "authorized_agent": AGENT,
                "version": 1,
                "policy_hash": [1, 2, 3],
            },
        },
    ]

    parsed = parse_setup_from_tx(events, [])

    assert parsed is not None
    assert parsed.vault_object_id == VAULT_ID.lower()
    assert parsed.policy_object_id == POLICY_ID.lower()
    assert parsed.panda_object_id == PANDA_ID.lower()
    assert parsed.owner == OWNER
    assert parsed.authorized_agent == AGENT


def test_parse_setup_from_tx_accepts_v2_event_package_id():
    events = [
        {
            "type": f"{V2_EVENT_PKG}::trading_policy::TradingPolicyCreated",
            "parsedJson": {
                "policy_id": POLICY_ID,
                "panda_id": PANDA_ID,
                "owner": OWNER,
                "authorized_agent": AGENT,
                "version": 1,
                "policy_hash": [1, 2, 3],
            },
        },
        {
            "type": f"{V2_EVENT_PKG}::panda_vault::PandaVaultCreated",
            "parsedJson": {
                "vault_id": VAULT_ID,
                "panda_id": PANDA_ID,
                "owner": OWNER,
                "policy_id": POLICY_ID,
                "authorized_agent": AGENT,
            },
        },
    ]

    parsed = parse_setup_from_tx(events, [])

    assert parsed is not None
    assert parsed.policy_object_id == POLICY_ID.lower()
    assert parsed.panda_object_id == PANDA_ID.lower()


def test_parse_setup_from_tx_falls_back_to_object_changes():
    object_changes = [
        {
            "type": "created",
            "objectId": VAULT_ID,
            "objectType": "0xabc::panda_vault::PandaVault",
        },
        {
            "type": "created",
            "objectId": POLICY_ID,
            "objectType": "0xabc::trading_policy::TradingPolicy",
        },
        {
            "type": "mutated",
            "objectId": PANDA_ID,
            "objectType": "0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465::panda::Panda",
        },
    ]

    parsed = parse_setup_from_tx([], object_changes)

    assert parsed is not None
    assert parsed.vault_object_id == VAULT_ID.lower()
    assert parsed.policy_object_id == POLICY_ID.lower()
    assert parsed.panda_object_id == PANDA_ID.lower()


@pytest.mark.asyncio
async def test_fetch_setup_from_tx_parses_real_testnet_setup():
    parsed = await fetch_setup_from_tx(REAL_SETUP_TX)

    assert parsed.policy_object_id == REAL_POLICY_ID.lower()
    assert parsed.panda_object_id == REAL_PANDA_ID.lower()
    assert parsed.vault_object_id == REAL_VAULT_ID.lower()

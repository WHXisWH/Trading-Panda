"""PandaActor loader helpers."""

from decimal import Decimal
from types import SimpleNamespace

from app.engine.panda_loader import positions_dict


def test_positions_dict_restores_positive_positions_as_canonical_pairs():
    rows = [
        SimpleNamespace(pair="DEEP/SUI", quantity=Decimal("12.5")),
        SimpleNamespace(pair="SUI-USDC", quantity=Decimal("0")),
    ]

    assert positions_dict(rows) == {"DEEP-SUI": 12.5}

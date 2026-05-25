"""Talent id → display metadata — aligned with frontend/src/lib/talent.ts."""

from __future__ import annotations

TALENT_META: dict[int, dict[str, str]] = {
    0: {"name": "无天赋", "description": "普通熊猫，靠努力成长"},
    1: {"name": "趋势猎手", "description": "顺势信号权重 +15%"},
    2: {"name": "反向嗅觉", "description": "逆向信号权重 +15%"},
    3: {"name": "铁手腕", "description": "止损触发阈值收紧 20%"},
    4: {"name": "快手", "description": "决策延迟 -30ms"},
    5: {"name": "深度学习", "description": "经验积累速率 +20%"},
    6: {"name": "情绪免疫", "description": "情绪偏差系数 ×0.5"},
}


def talent_payload(talent_id: int) -> dict[str, str | int]:
    meta = TALENT_META.get(talent_id, TALENT_META[0])
    return {
        "id": talent_id,
        "name": meta["name"],
        "description": meta["description"],
    }

"""Strategy feed & validate — Epic 2."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Panda, Strategy, StrategyHistory, User
from app.engine.rule_engine import RuleEngine, validate_signal_rules
from app.engine.strategy_ghost import ghost_weight_for_trades
from app.integrations.deepseek import parse_strategy_text
from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.strategy import (
    RAW_TEXT_MIN,
    InvalidRuleDetail,
    ParsedStrategyLayers,
    PolicyConflictDetail,
    StrategyFeedRequest,
    StrategyUpdateRequest,
    StrategyValidateData,
    StrategyValidatePreviewSignal,
)
from app.services.personality_match import calc_personality_match, panda_reaction_for_match
from app.services.policy_compatibility import (
    check_policy_compatibility,
    compatibility_to_dict,
    load_active_trading_policy,
    load_panda_fallback_pairs,
    resolve_target_pairs,
)
from app.services.agent_wallet import resolve_training_budget
from app.services.strategy_parse_normalize import build_heuristic_draft, normalize_llm_parsed
from app.services.strategy_rate_limit import check_llm_rate_limit

DEFAULT_MARKET_SNAPSHOT: dict[str, Any] = {
    "asset": "BTC",
    "rsi": 28,
    "price": 58800,
    "prev_price": 59200,
    "ma20": 60000,
    "prev_ma20": 60100,
    "market_regime": "bear",
    "macd_signal": "golden_cross",
}

_MOCK_PARSED: dict[str, Any] = {
    "philosophy": "trend_following",
    "position_sizing": {"type": "fixed", "value": 0.1, "scale_in": False},
    "signal_rules": [{"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"}],
    "risk_management": {
        "stop_loss_pct": 0.05,
        "take_profit_pct": 0.15,
        "max_drawdown_pct": 0.20,
    },
}


async def load_owned_panda(
    panda_id: str,
    user: User,
    db: AsyncSession,
) -> Panda:
    result = await db.execute(
        select(Panda).where(Panda.id == panda_id, Panda.owner_id == user.id)
    )
    panda = result.scalar_one_or_none()
    if panda is None:
        raise ApiError(ApiErrorCode.PANDA_NOT_FOUND, "Panda not found")
    return panda


def parsed_to_dict(parsed: ParsedStrategyLayers) -> dict[str, Any]:
    return parsed.model_dump(exclude_none=True)


def strategy_hash_from_parsed(parsed: ParsedStrategyLayers) -> str:
    payload = json.dumps(parsed_to_dict(parsed), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def summarize_parsed(parsed: ParsedStrategyLayers) -> str:
    parts: list[str] = []
    for rule in parsed.signal_rules:
        threshold = f"{rule.threshold}" if rule.threshold is not None else ""
        parts.append(f"{rule.indicator}{rule.condition}{threshold}→{rule.action}")
    sizing = parsed.position_sizing
    pct = sizing.value if sizing.value is not None else sizing.max_position_pct
    if pct is not None:
        parts.append(f"仓位{int(float(pct) * 100)}%")
    risk = parsed.risk_management
    parts.append(f"止损{int(float(risk.stop_loss_pct) * 100)}%")
    return "; ".join(parts)


PHILOSOPHY_LABELS: dict[str, str] = {
    "trend_following": "Trend",
    "contrarian": "Reversal",
    "intuition_driven": "Intuition",
    "grid": "Range",
    "custom": "Custom",
}


def build_human_summary(parsed: ParsedStrategyLayers) -> str:
    label = PHILOSOPHY_LABELS.get(parsed.philosophy, parsed.philosophy)
    buy_bits: list[str] = []
    sell_bits: list[str] = []
    for rule in parsed.signal_rules:
        bit = f"{rule.indicator} {rule.condition}"
        if rule.threshold is not None:
            bit = f"{rule.indicator} {rule.condition.replace(str(int(rule.threshold)), str(rule.threshold))}"
        if rule.action == "BUY":
            buy_bits.append(bit)
        else:
            sell_bits.append(bit)
    buy_text = ", ".join(buy_bits[:2]) if buy_bits else "no buy rules yet"
    sell_text = ", ".join(sell_bits[:2]) if sell_bits else "no sell rules yet"
    return (
        f"{label} playbook: lean buy when {buy_text}; lean sell when {sell_text}."
    )


def build_auto_title(parsed: ParsedStrategyLayers) -> str:
    label = PHILOSOPHY_LABELS.get(parsed.philosophy, parsed.philosophy)
    first_rule = parsed.signal_rules[0]
    return f"{label} · {first_rule.indicator}"


async def parse_strategy_only(
    body: StrategyFeedRequest,
    user_id: str,
) -> dict[str, Any]:
    if not body.raw_text or len(body.raw_text.strip()) < RAW_TEXT_MIN:
        raise ApiError(
            ApiErrorCode.STRATEGY_TEXT_TOO_SHORT,
            f"Strategy text must be at least {RAW_TEXT_MIN} characters",
        )
    parse_body = StrategyFeedRequest(
        raw_text=body.raw_text,
        parse_with_llm=True,
        activate=False,
    )
    parsed, user_raw, normalize_warnings = await resolve_parsed_layers(parse_body, user_id)
    compiled_count, invalid_rules = parsed.validate_compilable_rules()
    invalid_details = [
        InvalidRuleDetail(
            index=item["index"],
            reason=item["reason"],
            indicator=item.get("indicator"),
        )
        for item in invalid_rules
    ]
    warnings = [*normalize_warnings, *collect_warnings(parsed)]
    if invalid_rules:
        warnings.append(
            "Some rules need tuning before save — edit the signal rules below."
        )
    return {
        "parsed": parsed_to_dict(parsed),
        "raw_text": user_raw,
        "title": build_auto_title(parsed),
        "human_summary": build_human_summary(parsed),
        "warnings": warnings,
        "invalid_rules": [item.model_dump() for item in invalid_details],
        "draft_valid": compiled_count > 0,
    }


async def resolve_parsed_layers(
    body: StrategyFeedRequest,
    user_id: str,
) -> tuple[ParsedStrategyLayers, str | None, list[str]]:
    if body.parsed is not None:
        return body.parsed, body.raw_text, []

    if not body.raw_text:
        raise ApiError(ApiErrorCode.STRATEGY_BODY_EMPTY, "raw_text or parsed is required")

    if body.resolved_parse_with_llm():
        check_llm_rate_limit(user_id)
        normalize_warnings: list[str] = []
        try:
            if settings.deepseek_api_key:
                raw_parsed = await parse_strategy_text(body.raw_text)
            else:
                raw_parsed = _MOCK_PARSED
            normalized, normalize_warnings = normalize_llm_parsed(raw_parsed, body.raw_text or "")
            try:
                layers = ParsedStrategyLayers.model_validate(normalized)
            except Exception:
                layers = ParsedStrategyLayers.model_validate(
                    build_heuristic_draft(body.raw_text or "")
                )
                normalize_warnings = [
                    *normalize_warnings,
                    "LLM output could not be validated — a starter draft was applied.",
                ]
        except ApiError:
            raise
        except Exception as exc:
            try:
                layers = ParsedStrategyLayers.model_validate(
                    build_heuristic_draft(body.raw_text or "")
                )
                normalize_warnings = [
                    f"LLM parse failed ({exc}) — a starter draft was applied.",
                ]
            except Exception as fallback_exc:
                raise ApiError(
                    ApiErrorCode.STRATEGY_PARSE_FAILED,
                    f"Could not parse strategy: {exc}",
                ) from fallback_exc
        return layers, body.raw_text, normalize_warnings

    raise ApiError(
        ApiErrorCode.STRATEGY_BODY_EMPTY,
        "parsed is required when parse_with_llm is false",
    )


def collect_warnings(parsed: ParsedStrategyLayers) -> list[str]:
    warnings: list[str] = []
    actions = {r.action for r in parsed.signal_rules}
    if "BUY" in actions and "SELL" not in actions:
        warnings.append("仅有 BUY 规则，无 SELL（MVP 只做多，建议补充卖出条件）")
    if "SELL" in actions and "BUY" not in actions:
        warnings.append("仅有 SELL 规则，无 BUY")

    has_rsi = any(r.indicator == "RSI" for r in parsed.signal_rules)
    has_ma = any(r.indicator in ("MA20", "MA") for r in parsed.signal_rules)
    if parsed.philosophy == "trend_following" and has_rsi and not has_ma:
        warnings.append("趋势跟踪哲学下以 RSI 为主，可考虑补充均线规则")
    if parsed.philosophy == "contrarian" and has_ma and not has_rsi:
        warnings.append("逆向哲学下以均线为主，风格可能不一致")

    return warnings


def build_preview_signal(
    parsed: ParsedStrategyLayers,
    market: dict[str, Any],
) -> StrategyValidatePreviewSignal:
    rules = parsed.to_rule_dicts()
    engine = RuleEngine(rules)
    signed, buy_hits, sell_hits, matched = engine.match_signal_detail(market)
    return StrategyValidatePreviewSignal(
        signed_score=round(signed, 4),
        buy_hits=buy_hits,
        sell_hits=sell_hits,
        total_rules=len(rules),
        matched_rule_indexes=matched,
    )


def validate_strategy_body(
    body: StrategyFeedRequest,
    *,
    market_snapshot: dict[str, Any] | None = None,
    policy_mirror=None,
    fallback_pairs: list[str] | None = None,
    initial_capital: float = 10_000.0,
) -> StrategyValidateData:
    if body.raw_text is None and body.parsed is None:
        return StrategyValidateData(
            valid=False,
            compiled_count=0,
            invalid_rules=[
                InvalidRuleDetail(index=-1, reason="body_empty", indicator=None)
            ],
            warnings=[],
        )

    if body.raw_text is not None and len(body.raw_text) < 10:
        return StrategyValidateData(
            valid=False,
            compiled_count=0,
            invalid_rules=[],
            warnings=["策略文本过短"],
        )

    parsed = body.parsed
    if parsed is None:
        return StrategyValidateData(
            valid=False,
            compiled_count=0,
            invalid_rules=[],
            warnings=["仅 raw_text 时需先 LLM 解析或传入 parsed"],
        )

    compiled_count, invalid = parsed.validate_compilable_rules()
    invalid_details = [
        InvalidRuleDetail(
            index=item["index"],
            reason=item["reason"],
            indicator=item.get("indicator"),
        )
        for item in invalid
    ]

    if compiled_count == 0:
        return StrategyValidateData(
            valid=False,
            compiled_count=0,
            invalid_rules=invalid_details,
            warnings=[],
        )

    if invalid:
        return StrategyValidateData(
            valid=False,
            compiled_count=compiled_count,
            invalid_rules=invalid_details,
            warnings=collect_warnings(parsed),
        )

    market = market_snapshot or DEFAULT_MARKET_SNAPSHOT
    preview = build_preview_signal(parsed, market)
    warnings = collect_warnings(parsed)

    target_pairs = resolve_target_pairs(parsed, fallback_pairs=fallback_pairs)
    policy_result = check_policy_compatibility(
        parsed,
        policy_mirror,
        target_pairs=target_pairs,
        initial_capital=initial_capital,
    )
    if policy_mirror and not policy_result.compatible:
        warnings.append(policy_result.summary or "Strategy conflicts with TradingPolicy.")

    valid = True
    if policy_mirror is not None:
        valid = policy_result.compatible

    return StrategyValidateData(
        valid=valid,
        compiled_count=compiled_count,
        invalid_rules=[],
        preview_signal=preview,
        warnings=warnings,
        policy_compatible=policy_result.compatible if policy_mirror else None,
        policy_version=policy_result.policy_version,
        policy_paused=policy_result.policy_paused,
        policy_summary=policy_result.summary,
        allowed_pairs=policy_result.allowed_pairs,
        blocked_pairs=policy_result.blocked_pairs,
        target_pairs=policy_result.target_pairs,
        policy_conflicts=policy_result.conflicts,
    )


async def validate_strategy_for_panda(
    panda_id: str,
    body: StrategyFeedRequest,
    db: AsyncSession,
    *,
    market_snapshot: dict[str, Any] | None = None,
) -> StrategyValidateData:
    policy_mirror = await load_active_trading_policy(db, panda_id)
    fallback_pairs = await load_panda_fallback_pairs(db, panda_id)
    initial_capital = await resolve_training_budget(panda_id, db)
    return validate_strategy_body(
        body,
        market_snapshot=market_snapshot,
        policy_mirror=policy_mirror,
        fallback_pairs=fallback_pairs,
        initial_capital=initial_capital,
    )


async def next_strategy_version(panda_id: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Strategy).where(Strategy.panda_id == panda_id)
    )
    return int(result.scalar() or 0) + 1


async def load_ghost_summary(panda_id: str, db: AsyncSession) -> dict[str, Any] | None:
    result = await db.execute(
        select(StrategyHistory)
        .where(StrategyHistory.panda_id == panda_id)
        .order_by(StrategyHistory.switched_at.desc())
        .limit(1)
    )
    ghost = result.scalar_one_or_none()
    if ghost is None:
        return None
    weight = float(ghost.ghost_weight or 0)
    trades = int(ghost.trades_since_switch or 0)
    return {
        "ghost_weight": round(weight, 4),
        "trades_since_switch": trades,
        "expected_decay_trades": 50,
        "summary": "Old habits may fade over the next trades as the Panda practices the new strategy.",
    }


def _raise_policy_conflicts(conflicts: list[PolicyConflictDetail]) -> None:
    raise ApiError(
        ApiErrorCode.STRATEGY_POLICY_CONFLICT,
        conflicts[0].message if conflicts else "Strategy conflicts with TradingPolicy",
        policy_conflicts=[c.model_dump() for c in conflicts],
    )


async def _strategy_version_for_row(panda_id: str, strategy: Strategy, db: AsyncSession) -> int:
    version_result = await db.execute(
        select(func.count())
        .select_from(Strategy)
        .where(Strategy.panda_id == panda_id, Strategy.created_at <= strategy.created_at)
    )
    return int(version_result.scalar() or 1)


async def _strategy_list_item(
    strategy: Strategy,
    panda: Panda | None,
    db: AsyncSession,
) -> dict[str, Any]:
    parsed = ParsedStrategyLayers.model_validate(strategy.parsed_json)
    match = calc_personality_match(panda, parsed) if panda else 50
    return {
        "strategy_id": strategy.id,
        "version": await _strategy_version_for_row(strategy.panda_id, strategy, db),
        "raw_text": strategy.raw_text,
        "parsed": strategy.parsed_json,
        "strategy_hash": strategy.strategy_hash,
        "proficiency": int(strategy.proficiency),
        "is_active": bool(strategy.is_active),
        "personality_match": match,
        "created_at": strategy.created_at.isoformat() if strategy.created_at else None,
    }


async def list_strategy_records(panda_id: str, db: AsyncSession) -> list[dict[str, Any]]:
    panda_result = await db.execute(select(Panda).where(Panda.id == panda_id))
    panda = panda_result.scalar_one_or_none()
    result = await db.execute(
        select(Strategy)
        .where(Strategy.panda_id == panda_id)
        .order_by(Strategy.is_active.desc(), Strategy.created_at.desc())
    )
    rows = result.scalars().all()
    return [await _strategy_list_item(row, panda, db) for row in rows]


async def _load_owned_strategy(
    panda_id: str,
    strategy_id: str,
    db: AsyncSession,
) -> Strategy:
    result = await db.execute(
        select(Strategy).where(Strategy.panda_id == panda_id, Strategy.id == strategy_id)
    )
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise ApiError(ApiErrorCode.STRATEGY_NOT_FOUND, "Strategy not found")
    return strategy


async def _apply_activation(
    panda: Panda,
    strategy_id: str,
    db: AsyncSession,
) -> dict[str, Any] | None:
    old_result = await db.execute(
        select(Strategy).where(Strategy.panda_id == panda.id, Strategy.is_active == True)
    )
    old_strategy = old_result.scalar_one_or_none()

    previous_shadow = None
    if old_strategy is not None and old_strategy.id != strategy_id:
        ghost = StrategyHistory(
            panda_id=panda.id,
            strategy_hash=old_strategy.strategy_hash,
            proficiency_at_switch=int(old_strategy.proficiency),
            ghost_weight=Decimal("0.4000"),
            trades_since_switch=0,
        )
        db.add(ghost)
        previous_shadow = {
            "ghost_weight": 0.40,
            "expected_decay_trades": 50,
        }

    await db.execute(
        update(Strategy)
        .where(Strategy.panda_id == panda.id, Strategy.is_active == True)
        .values(is_active=False)
    )
    await db.execute(
        update(Strategy)
        .where(Strategy.id == strategy_id, Strategy.panda_id == panda.id)
        .values(is_active=True)
    )
    return previous_shadow


async def feed_strategy(
    panda: Panda,
    body: StrategyFeedRequest,
    db: AsyncSession,
    user_id: str,
) -> dict[str, Any]:
    if panda.is_trading:
        raise ApiError(
            ApiErrorCode.PANDA_IS_TRADING,
            "Panda is training on the Training Ledger; stop the session before changing strategy",
        )

    body.validate_for_feed()
    parsed, user_raw, _ = await resolve_parsed_layers(body, user_id)
    body.validate_for_feed()

    policy_mirror = await load_active_trading_policy(db, panda.id)
    fallback_pairs = await load_panda_fallback_pairs(db, panda.id)
    target_pairs = resolve_target_pairs(parsed, fallback_pairs=fallback_pairs)
    policy_result = check_policy_compatibility(
        parsed,
        policy_mirror,
        target_pairs=target_pairs,
    )
    if body.activate and policy_mirror is not None and not policy_result.compatible:
        _raise_policy_conflicts(policy_result.conflicts)

    strategy_hash = strategy_hash_from_parsed(parsed)
    raw_text = (user_raw or "").strip() or build_auto_title(parsed)
    version = await next_strategy_version(panda.id, db)
    personality_match = calc_personality_match(panda, parsed)
    parsed_dict = parsed_to_dict(parsed)

    strategy = Strategy(
        panda_id=panda.id,
        raw_text=raw_text,
        parsed_json=parsed_dict,
        strategy_hash=strategy_hash,
        philosophy=parsed.philosophy,
        proficiency=0,
        is_active=False,
    )
    db.add(strategy)
    await db.flush()

    previous_shadow = None
    if body.activate:
        previous_shadow = await _apply_activation(panda, strategy.id, db)

    await db.commit()
    await db.refresh(strategy)

    return {
        "strategy_id": strategy.id,
        "version": version,
        "raw_text": raw_text,
        "parsed": parsed_dict,
        "strategy_hash": strategy_hash,
        "proficiency": 0,
        "personality_match": personality_match,
        "is_active": strategy.is_active,
        "previous_strategy_shadow": previous_shadow,
        "panda_reaction": panda_reaction_for_match(personality_match, parsed.philosophy),
        "policy_version": policy_result.policy_version,
        "policy_compatible": policy_result.compatible if policy_mirror else None,
        "target_pairs": policy_result.target_pairs,
    }


async def update_strategy_record(
    panda: Panda,
    strategy_id: str,
    body: StrategyUpdateRequest,
    db: AsyncSession,
) -> dict[str, Any]:
    if panda.is_trading:
        raise ApiError(
            ApiErrorCode.PANDA_IS_TRADING,
            "Panda is training on the Training Ledger; stop the session before changing strategy",
        )

    strategy = await _load_owned_strategy(panda.id, strategy_id, db)
    parsed = (
        body.parsed
        if body.parsed is not None
        else ParsedStrategyLayers.model_validate(strategy.parsed_json)
    )
    if body.parsed is not None:
        compiled_count, invalid_rules = parsed.validate_compilable_rules()
        if compiled_count == 0:
            raise ApiError(
                ApiErrorCode.STRATEGY_NO_VALID_RULES,
                "No compilable signal rules",
                invalid_rules=invalid_rules or None,
            )
        if invalid_rules:
            raise ApiError(
                ApiErrorCode.STRATEGY_RULE_INVALID,
                "Some signal rules cannot be compiled",
                invalid_rules=invalid_rules,
            )

    policy_mirror = await load_active_trading_policy(db, panda.id)
    fallback_pairs = await load_panda_fallback_pairs(db, panda.id)
    policy_result = check_policy_compatibility(
        parsed,
        policy_mirror,
        target_pairs=resolve_target_pairs(parsed, fallback_pairs=fallback_pairs),
    )
    if strategy.is_active and policy_mirror is not None and not policy_result.compatible:
        _raise_policy_conflicts(policy_result.conflicts)

    if body.raw_text:
        strategy.raw_text = body.raw_text.strip()
    strategy.parsed_json = parsed_to_dict(parsed)
    strategy.strategy_hash = strategy_hash_from_parsed(parsed)
    strategy.philosophy = parsed.philosophy
    await db.commit()
    await db.refresh(strategy)

    panda_result = await db.execute(select(Panda).where(Panda.id == panda.id))
    panda_row = panda_result.scalar_one_or_none()
    return await _strategy_list_item(strategy, panda_row, db)


async def activate_strategy_record(
    panda: Panda,
    strategy_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    if panda.is_trading:
        raise ApiError(
            ApiErrorCode.PANDA_IS_TRADING,
            "Panda is training on the Training Ledger; stop the session before changing strategy",
        )

    strategy = await _load_owned_strategy(panda.id, strategy_id, db)
    parsed = ParsedStrategyLayers.model_validate(strategy.parsed_json)
    policy_mirror = await load_active_trading_policy(db, panda.id)
    fallback_pairs = await load_panda_fallback_pairs(db, panda.id)
    policy_result = check_policy_compatibility(
        parsed,
        policy_mirror,
        target_pairs=resolve_target_pairs(parsed, fallback_pairs=fallback_pairs),
    )
    if policy_mirror is not None and not policy_result.compatible:
        _raise_policy_conflicts(policy_result.conflicts)

    previous_shadow = await _apply_activation(panda, strategy.id, db)
    await db.commit()
    await db.refresh(strategy)

    personality_match = calc_personality_match(panda, parsed)
    version = await _strategy_version_for_row(panda.id, strategy, db)
    return {
        "strategy_id": strategy.id,
        "version": version,
        "raw_text": strategy.raw_text,
        "parsed": strategy.parsed_json,
        "strategy_hash": strategy.strategy_hash,
        "proficiency": int(strategy.proficiency),
        "personality_match": personality_match,
        "is_active": True,
        "previous_strategy_shadow": previous_shadow,
        "panda_reaction": panda_reaction_for_match(personality_match, parsed.philosophy),
        "policy_version": policy_result.policy_version,
        "policy_compatible": policy_result.compatible if policy_mirror else None,
        "target_pairs": policy_result.target_pairs,
    }


async def get_active_strategy_record(
    panda_id: str,
    db: AsyncSession,
) -> dict[str, Any] | None:
    result = await db.execute(
        select(Strategy).where(Strategy.panda_id == panda_id, Strategy.is_active == True)
    )
    strategy = result.scalar_one_or_none()
    if strategy is None:
        return None

    panda_result = await db.execute(select(Panda).where(Panda.id == panda_id))
    panda = panda_result.scalar_one_or_none()
    parsed = ParsedStrategyLayers.model_validate(strategy.parsed_json)
    match = calc_personality_match(panda, parsed) if panda else 50
    version_result = await db.execute(
        select(func.count())
        .select_from(Strategy)
        .where(Strategy.panda_id == panda_id, Strategy.created_at <= strategy.created_at)
    )
    version = int(version_result.scalar() or 1)
    policy_mirror = await load_active_trading_policy(db, panda_id)
    ghost_summary = await load_ghost_summary(panda_id, db)
    policy_payload = compatibility_to_dict(
        check_policy_compatibility(
            parsed,
            policy_mirror,
            target_pairs=resolve_target_pairs(
                parsed,
                fallback_pairs=await load_panda_fallback_pairs(db, panda_id),
            ),
        )
    )

    return {
        "strategy_id": strategy.id,
        "version": version,
        "raw_text": strategy.raw_text,
        "parsed": strategy.parsed_json,
        "strategy_hash": strategy.strategy_hash,
        "proficiency": int(strategy.proficiency),
        "is_active": strategy.is_active,
        "personality_match": match,
        "created_at": strategy.created_at.isoformat() if strategy.created_at else None,
        "ghost_influence": ghost_summary,
        **policy_payload,
    }

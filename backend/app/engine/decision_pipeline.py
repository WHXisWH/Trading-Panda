"""8-Step Decision Pipeline — must complete in <50ms.

Thresholds (PRD C12):
  |score| > entry_threshold → EXECUTE
  0.40 ≤ |score| < entry_threshold → OBSERVE
  |score| < 0.40 → IGNORE
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any

from app.engine.experience_engine import ExperienceEngine
from app.engine.rule_engine import RuleEngine, normalize_philosophy

STRATEGY_MARKET_MATCH: dict[tuple[str, str], float] = {
    ("趋势跟踪", "bull"): 1.0,
    ("趋势跟踪", "bear"): 0.85,
    ("趋势跟踪", "ranging"): 0.7,
    ("逆向抄底", "bull"): 0.7,
    ("逆向抄底", "bear"): 1.0,
    ("逆向抄底", "ranging"): 0.85,
    ("网格交易", "bull"): 0.7,
    ("网格交易", "bear"): 0.7,
    ("网格交易", "ranging"): 1.0,
}

EMOTION_PROFILES: dict[str, dict[str, float]] = {
    "focused": {"signal": 1.0, "position": 1.0, "stoploss": 1.0, "threshold": 1.0},
    "excited": {"signal": 1.1, "position": 1.2, "stoploss": 1.1, "threshold": 0.9},
    "greedy": {"signal": 1.3, "position": 1.6, "stoploss": 1.4, "threshold": 0.7},
    "cautious": {"signal": 0.85, "position": 0.7, "stoploss": 0.85, "threshold": 1.2},
    "panicking": {"signal": 0.5, "position": 0.3, "stoploss": 0.6, "threshold": 1.6},
    "numb": {"signal": 0.6, "position": 0.5, "stoploss": 1.0, "threshold": 1.4},
}


@dataclass
class DecisionResult:
    final_score: float
    action: str  # BUY | SELL | HOLD
    steps: list[dict]
    zone: str = "IGNORE"  # EXECUTE | OBSERVE | IGNORE
    entry_delay: int = 0
    entry_threshold: float = 0.65
    position_factor: float = 1.0
    emotion_position_mod: float = 1.0
    emotion_stoploss_mod: float = 1.0
    signal_direction: int = 0  # +1 buy, -1 sell


@dataclass
class PipelineContext:
    """Mutable per-tick metadata passed through steps."""

    entry_threshold: float = 0.65
    entry_delay: int = 0
    position_factor: float = 1.0
    emotion_position_mod: float = 1.0
    emotion_stoploss_mod: float = 1.0
    signal_direction: int = 0


class DecisionPipeline:
    """Stateless pipeline — one invocation per market tick per actor."""

    def __init__(self, rng: random.Random | None = None) -> None:
        self._rng = rng or random.Random()
        self._experience = ExperienceEngine("")

    def run(
        self,
        market_data: dict[str, Any],
        personality: dict[str, Any],
        strategy: dict[str, Any],
        experience: dict[str, Any],
        emotion: str,
        ghost_weight: float = 0.0,
        ghost_strategy: dict[str, Any] | None = None,
        positions: dict[str, float] | None = None,
        social_signal: float = 0.0,
        skill_memories: list[dict[str, Any]] | None = None,
    ) -> DecisionResult:
        ctx = PipelineContext()
        steps: list[dict] = []
        exp_engine = ExperienceEngine(personality.get("panda_id", ""))

        s_raw, direction = self._step1_raw_signal(market_data, strategy, personality)
        ctx.signal_direction = direction
        steps.append({"step": 1, "name": "策略原始信号", "score": s_raw, "direction": direction})

        s_prof = self._step2_proficiency_noise(s_raw, strategy, personality)
        steps.append({"step": 2, "name": "熟练度噪声", "score": s_prof})

        s_exp = self._step3_experience(
            s_prof, market_data, experience, exp_engine, skill_memories
        )
        steps.append({"step": 3, "name": "经验修正", "score": s_exp})

        s_fuse = self._step4_fusion(
            s_prof, s_exp, personality, ghost_weight, ghost_strategy, market_data
        )
        steps.append({"step": 4, "name": "融合", "score": s_fuse})

        s_pers = self._step5_personality(s_fuse, personality, ctx)
        steps.append({"step": 5, "name": "性格过滤", "score": s_pers})

        s_env = self._step6_environment(s_pers, personality, strategy, market_data, positions or {})
        steps.append({"step": 6, "name": "环境适配", "score": s_env})

        s_social = self._step7_social(s_env, personality, social_signal)
        steps.append({"step": 7, "name": "社交偏移", "score": s_social})

        s_final = self._step8_emotion(s_social, emotion, personality, ctx)
        steps.append({"step": 8, "name": "情绪扭曲", "score": s_final})

        signed_score = s_final * (direction or 1)
        action, zone = self._determine_action(signed_score, ctx.entry_threshold, direction)

        return DecisionResult(
            final_score=signed_score,
            action=action,
            steps=steps,
            zone=zone,
            entry_delay=ctx.entry_delay,
            entry_threshold=ctx.entry_threshold,
            position_factor=ctx.position_factor,
            emotion_position_mod=ctx.emotion_position_mod,
            emotion_stoploss_mod=ctx.emotion_stoploss_mod,
            signal_direction=direction,
        )

    def _step1_raw_signal(
        self, market: dict, strategy: dict, personality: dict
    ) -> tuple[float, int]:
        rules = strategy.get("signal_rules") or strategy.get("parsed_json", {}).get("signal_rules", [])
        engine = RuleEngine(rules)
        signed = engine.match_signals(market)
        direction = 0 if signed == 0 else (1 if signed > 0 else -1)
        s_raw = abs(signed)

        philosophy = normalize_philosophy(strategy.get("philosophy", ""))
        if philosophy == "趋势跟踪" and direction > 0:
            s_raw = min(1.0, s_raw * 1.2)
        elif philosophy == "趋势跟踪" and direction < 0:
            s_raw *= 0.8
        elif philosophy == "逆向抄底" and direction > 0:
            s_raw *= 0.8
        elif philosophy == "逆向抄底" and direction < 0:
            s_raw = min(1.0, s_raw * 1.2)

        intuition = int(personality.get("intuition", 0))
        exp_level = int(personality.get("experience_level", 0))
        proficiency = int(strategy.get("proficiency", strategy.get("strategy_proficiency", 0)))

        if s_raw == 0 and intuition > 0:
            intuition_strength = intuition / 200 + exp_level / 200
            intuition_weight = intuition_strength * proficiency / 100
            if philosophy == "直觉驱动":
                intuition_weight *= 1.5
            if self._rng.random() < intuition_weight:
                s_raw = intuition_weight
                direction = 1 if self._rng.random() > 0.5 else -1

        return min(1.0, max(0.0, s_raw)), direction

    def _step2_proficiency_noise(self, s_raw: float, strategy: dict, personality: dict) -> float:
        prof = int(strategy.get("proficiency", strategy.get("strategy_proficiency", 0)))
        if prof < 20:
            noise = self._rng.uniform(-0.30, 0.30)
        elif prof < 50:
            noise = self._rng.uniform(-0.15, 0.15)
        elif prof < 80:
            noise = self._rng.uniform(-0.05, 0.05)
        else:
            noise = 0.0
        boldness = int(personality.get("boldness", 50)) / 100
        return min(1.0, max(0.0, s_raw * (1 + noise * boldness)))

    def _step3_experience(
        self,
        s_prof: float,
        market: dict,
        experience: dict,
        exp_engine: ExperienceEngine,
        skill_memories: list[dict[str, Any]] | None = None,
    ) -> float:
        asset = market.get("asset", "BTC")
        regime = market.get("market_regime", "unknown")
        pair = market.get("pair") or market.get("pool")
        pattern_hash = exp_engine.compute_pattern_hash(market)
        correction = 0.0
        correction += exp_engine.pattern_correction(pattern_hash, asset, experience)
        correction += exp_engine.mastery_correction(asset, experience)
        signal_type = exp_engine.classify_signal_type(market)
        correction += exp_engine.mistake_penalty(signal_type, experience)
        correction += exp_engine.cycle_bonus(regime, experience)
        correction += self._skill_memory_correction(skill_memories or [], pair, regime)
        return s_prof + correction

    def _skill_memory_correction(
        self,
        skill_memories: list[dict[str, Any]],
        pair: str | None,
        regime: str,
    ) -> float:
        if not skill_memories:
            return 0.0
        boost = 0.0
        for mem in skill_memories:
            confidence = float(mem.get("confidence", 0))
            if confidence <= 0:
                continue
            mem_pair = mem.get("pair")
            mem_regime = mem.get("market_regime")
            if mem_pair and pair and str(mem_pair).upper() != str(pair).upper():
                continue
            if mem_regime and mem_regime != regime:
                continue
            boost += min(0.05, confidence * 0.08)
        return min(0.12, boost)

    def _step4_fusion(
        self,
        s_prof: float,
        s_exp: float,
        personality: dict,
        ghost_weight: float,
        ghost_strategy: dict[str, Any] | None,
        market: dict,
    ) -> float:
        exp = int(personality.get("experience_level", 0))
        if exp < 25:
            w_strategy, w_experience = 0.55, 0.10
        elif exp < 65:
            w_strategy, w_experience = 0.50, 0.20
        else:
            w_strategy, w_experience = 0.30, 0.50

        s_fuse = s_prof * w_strategy + s_exp * w_experience

        if ghost_weight > 0 and ghost_strategy:
            old_rules = ghost_strategy.get("signal_rules", [])
            old_signal = abs(RuleEngine(old_rules).match_signals(market))
            cap = min(ghost_weight, 0.50)
            s_fuse = s_fuse * (1 - cap) + old_signal * cap

        return s_fuse

    def _step5_personality(self, s_fuse: float, personality: dict, ctx: PipelineContext) -> float:
        boldness = int(personality.get("boldness", 50))
        patience = int(personality.get("patience", 50))
        focus = int(personality.get("focus", 50))

        ctx.entry_threshold = 0.65 * (1 - (boldness - 50) / 200)
        ctx.entry_delay = max(0, patience // 20 - 1)
        ctx.position_factor = 0.6 + boldness / 250

        boldness_factor = 0.7 + (boldness / 100) * 0.6
        focus_bonus = 1 + (focus - 50) / 200
        return s_fuse * boldness_factor * focus_bonus

    def _step6_environment(
        self,
        s_pers: float,
        personality: dict,
        strategy: dict,
        market: dict,
        positions: dict[str, float],
    ) -> float:
        exp = int(personality.get("experience_level", 0))
        regime = market.get("market_regime", "unknown")
        philosophy = normalize_philosophy(strategy.get("philosophy", ""))

        if exp < 25:
            perception = 1
        elif exp < 50:
            perception = 2
        elif exp < 80:
            perception = 3
        else:
            perception = 4

        env_factor = 1.0
        if perception == 1 and regime in ("ranging", "bear", "sideways"):
            env_factor *= 0.7
        elif perception == 2:
            if float(market.get("trend_strength", 0.5)) < 0.3:
                env_factor *= 0.85

        market_match = STRATEGY_MARKET_MATCH.get((philosophy, regime), 0.85)
        if perception < 3 and market_match < 1.0:
            env_factor *= 0.7

        correlation_penalty = 1.0
        if perception >= 3:
            asset = market.get("asset", "")
            for held_asset, qty in positions.items():
                if held_asset != asset and qty > 0:
                    correlation_penalty = 0.5
                    break

        return s_pers * env_factor * market_match * correlation_penalty

    def _step7_social(self, s_env: float, personality: dict, social_signal: float) -> float:
        if social_signal == 0:
            return s_env
        contrarian = int(personality.get("contrarian", 50))
        bias = (contrarian - 50) / 100 * social_signal
        if contrarian < 30 and social_signal > 0:
            bias += 0.15
        elif contrarian > 70 and social_signal > 0:
            bias -= 0.15
        return s_env + bias

    def _step8_emotion(
        self, s_social: float, emotion: str, personality: dict, ctx: PipelineContext
    ) -> float:
        stability = int(
            personality.get(
                "emotion_stability",
                personality.get("patience", 50),
            )
        )
        profile = EMOTION_PROFILES.get(emotion, EMOTION_PROFILES["focused"])

        def dampen(raw: float) -> float:
            deviation = raw - 1.0
            return 1.0 + deviation * (1 - stability / 100)

        signal_factor = dampen(profile["signal"])
        ctx.emotion_position_mod = dampen(profile["position"])
        ctx.emotion_stoploss_mod = dampen(profile["stoploss"])
        ctx.entry_threshold *= dampen(profile["threshold"])
        return s_social * signal_factor

    def _determine_action(
        self, signed_score: float, entry_threshold: float, direction: int
    ) -> tuple[str, str]:
        magnitude = abs(signed_score)
        if magnitude > entry_threshold:
            if direction >= 0:
                return "BUY", "EXECUTE"
            return "SELL", "EXECUTE"
        if magnitude >= 0.40:
            return "HOLD", "OBSERVE"
        return "HOLD", "IGNORE"

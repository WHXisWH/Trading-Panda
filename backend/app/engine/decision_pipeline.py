"""8-Step Decision Pipeline — must complete in <50ms.

Step 1: Strategy raw signal  (rule engine + intuition fallback)
Step 2: Proficiency noise    (experience noise × boldness)
Step 3: Experience correction (pattern memory + mastery + mistake penalty)
Step 4: Fusion              (weighted by growth stage)
Step 5: Personality filter  (boldness factor + patience delay)
Step 6: Environment adapt   (env awareness coefficient × asset correlation)
Step 7: Social shift        (MVP: always 0)
Step 8: Emotion distortion  (emotion_coefficient × patience stability)

Final score thresholds (PRD C12):
  > 0.65  → EXECUTE
  0.40–0.65 → OBSERVE (may trigger Agent Coordinator)
  < 0.40  → IGNORE
"""
from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class DecisionResult:
    final_score: float
    action: str          # BUY | SELL | HOLD
    steps: list[dict]    # full 8-step trace for decision chain UI


class DecisionPipeline:
    """Stateless pipeline — called once per market tick per actor."""

    def run(
        self,
        market_data: Dict[str, Any],
        personality: Dict[str, Any],
        strategy: Dict[str, Any],
        experience: Dict[str, Any],
        emotion: str,
        ghost_weight: float = 0.0,
    ) -> DecisionResult:
        steps: list[dict] = []

        # Step 1: Strategy raw signal
        s_raw = self._step1_raw_signal(market_data, strategy, personality)
        steps.append({"step": 1, "name": "策略原始信号", "score": s_raw})

        # Step 2: Proficiency noise
        s_prof = self._step2_proficiency_noise(s_raw, strategy, personality)
        steps.append({"step": 2, "name": "熟练度噪声", "score": s_prof})

        # Step 3: Experience correction
        s_exp = self._step3_experience(s_prof, experience)
        steps.append({"step": 3, "name": "经验修正", "score": s_exp})

        # Step 4: Fusion (weights depend on experience_level)
        s_fuse = self._step4_fusion(s_prof, s_exp, personality, ghost_weight)
        steps.append({"step": 4, "name": "融合", "score": s_fuse})

        # Step 5: Personality filter
        s_pers = self._step5_personality(s_fuse, personality)
        steps.append({"step": 5, "name": "性格过滤", "score": s_pers})

        # Step 6: Environment adapt
        s_env = self._step6_environment(s_pers, personality, market_data)
        steps.append({"step": 6, "name": "环境适配", "score": s_env})

        # Step 7: Social shift (MVP: 0)
        s_social = s_env + 0.0
        steps.append({"step": 7, "name": "社交偏移(MVP=0)", "score": s_social})

        # Step 8: Emotion distortion
        s_final = self._step8_emotion(s_social, emotion, personality)
        steps.append({"step": 8, "name": "情绪扭曲", "score": s_final})

        action = self._determine_action(s_final)
        return DecisionResult(final_score=s_final, action=action, steps=steps)

    # ── Step implementations (stubs — fill in with actual formulas) ───────────

    def _step1_raw_signal(self, market: dict, strategy: dict, personality: dict) -> float:
        # TODO: run RuleEngine.match(market, strategy.signal_rules)
        # TODO: if s_raw == 0 and intuition > 0 → apply intuition signal
        return 0.0

    def _step2_proficiency_noise(self, s_raw: float, strategy: dict, personality: dict) -> float:
        # TODO: s_raw × (1 + noise(proficiency) × boldness/100)
        return s_raw

    def _step3_experience(self, s_prof: float, experience: dict) -> float:
        # TODO: pattern memory correction + mastery correction + mistake penalty
        return s_prof

    def _step4_fusion(self, s_prof: float, s_exp: float, personality: dict, ghost_weight: float) -> float:
        # TODO: weights depend on experience_level (cub/growing/mature)
        # TODO: apply ghost_weight for strategy shadow
        return s_prof * 0.7 + s_exp * 0.3

    def _step5_personality(self, s_fuse: float, personality: dict) -> float:
        # TODO: boldness_factor + patience entry delay
        return s_fuse

    def _step6_environment(self, s_pers: float, personality: dict, market: dict) -> float:
        # TODO: env awareness coefficient (Lv.1-4) × asset correlation correction
        # TODO: unaware assets → signal × 0.7
        return s_pers

    def _step8_emotion(self, s_social: float, emotion: str, personality: dict) -> float:
        # TODO: × emotion_coefficient × (1 - patience/100)
        EMOTION_COEFF = {
            "focused": 1.0, "excited": 1.1, "greedy": 1.3,
            "cautious": 0.85, "panicking": 0.5, "numb": 0.6,
        }
        coeff = EMOTION_COEFF.get(emotion, 1.0)
        patience = personality.get("patience", 50) / 100
        return s_social * coeff * (1 - patience * 0.1)

    def _determine_action(self, score: float) -> str:
        if score > 0.65:
            return "BUY" if score > 0 else "SELL"
        if score >= 0.40:
            return "HOLD"  # observe zone
        return "HOLD"  # ignore

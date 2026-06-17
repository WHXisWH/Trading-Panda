"""Strategy request/response schemas — Epic 2 feed & validate contracts."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.engine.rule_engine import validate_signal_rules
from app.schemas.errors import ApiError, ApiErrorCode

Philosophy = Literal[
    "trend_following",
    "contrarian",
    "intuition_driven",
    "grid",
    "custom",
]

SupportedIndicator = Literal["RSI", "MA20", "MACD", "PRICE"]
SignalAction = Literal["BUY", "SELL"]

RAW_TEXT_MIN = 10
RAW_TEXT_MAX = 2000
MAX_SIGNAL_RULES = 8


class SignalRule(BaseModel):
    indicator: SupportedIndicator
    condition: str = Field(..., min_length=1)
    threshold: float | None = None
    action: SignalAction
    weight: float | None = Field(default=None, ge=0, le=1)


class PositionSizingLayers(BaseModel):
    type: Literal["fixed", "kelly", "grid"] | None = None
    value: float | None = Field(default=None, ge=0.01, le=0.25)
    max_position_pct: float | None = Field(default=None, ge=0.01, le=1.0)
    scale_in: bool | None = None


class RiskManagementLayers(BaseModel):
    stop_loss_pct: float = Field(..., ge=0, le=1)
    take_profit_pct: float | None = Field(default=None, ge=0, le=1)
    max_drawdown_pct: float = Field(..., ge=0, le=1)


class ParsedStrategyLayers(BaseModel):
    philosophy: Philosophy
    position_sizing: PositionSizingLayers
    signal_rules: list[SignalRule] = Field(..., min_length=1, max_length=MAX_SIGNAL_RULES)
    risk_management: RiskManagementLayers
    target_pairs: list[str] = Field(default_factory=list, max_length=8)

    def compiled_rule_count(self) -> int:
        count, _ = validate_signal_rules(self.to_rule_dicts())
        return count

    def validate_compilable_rules(self) -> tuple[int, list[dict[str, Any]]]:
        return validate_signal_rules(self.to_rule_dicts())

    def to_rule_dicts(self) -> list[dict[str, Any]]:
        return [rule.model_dump(exclude_none=True) for rule in self.signal_rules]


class StrategyFeedRequest(BaseModel):
    raw_text: str | None = Field(default=None, max_length=RAW_TEXT_MAX)
    parsed: ParsedStrategyLayers | None = None
    parse_with_llm: bool | None = None

    @field_validator("raw_text")
    @classmethod
    def strip_raw_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def require_body(self) -> StrategyFeedRequest:
        if not self.raw_text and self.parsed is None:
            raise ValueError("raw_text or parsed is required")
        return self

    def resolved_parse_with_llm(self) -> bool:
        if self.parse_with_llm is not None:
            return self.parse_with_llm
        return self.parsed is None and self.raw_text is not None

    def validate_for_feed(self) -> None:
        """Raise ApiError for business validation (HTTP mapping via errors module)."""
        if self.raw_text is not None and len(self.raw_text) < RAW_TEXT_MIN:
            raise ApiError(
                ApiErrorCode.STRATEGY_TEXT_TOO_SHORT,
                f"Strategy text must be at least {RAW_TEXT_MIN} characters",
            )

        if self.parsed is None:
            return

        compiled_count, invalid_rules = self.parsed.validate_compilable_rules()
        if compiled_count == 0:
            code = (
                ApiErrorCode.STRATEGY_RULE_INVALID
                if invalid_rules
                else ApiErrorCode.STRATEGY_NO_VALID_RULES
            )
            raise ApiError(
                code,
                "No compilable signal rules",
                invalid_rules=invalid_rules or None,
            )

        if invalid_rules:
            raise ApiError(
                ApiErrorCode.STRATEGY_RULE_INVALID,
                "Some signal rules cannot be compiled",
                invalid_rules=invalid_rules,
            )


class InvalidRuleDetail(BaseModel):
    index: int
    reason: str
    indicator: str | None = None


class StrategyValidatePreviewSignal(BaseModel):
    signed_score: float
    buy_hits: int
    sell_hits: int
    total_rules: int
    matched_rule_indexes: list[int] = Field(default_factory=list)


class PolicyConflictDetail(BaseModel):
    field: str
    code: str
    message: str
    value: Any | None = None


class StrategyValidateData(BaseModel):
    valid: bool
    compiled_count: int
    invalid_rules: list[InvalidRuleDetail] = Field(default_factory=list)
    preview_signal: StrategyValidatePreviewSignal | None = None
    warnings: list[str] = Field(default_factory=list)
    policy_compatible: bool | None = None
    policy_version: int | None = None
    policy_paused: bool = False
    policy_summary: str | None = None
    allowed_pairs: list[str] = Field(default_factory=list)
    blocked_pairs: list[str] = Field(default_factory=list)
    target_pairs: list[str] = Field(default_factory=list)
    policy_conflicts: list[PolicyConflictDetail] = Field(default_factory=list)

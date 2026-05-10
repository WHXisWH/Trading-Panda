"""DeepSeek V3 integration — strategy parsing + Agent Coordinator.

Strategy parsing: natural language → 4-layer structured JSON
  {philosophy, position_sizing, signal_rules, risk_management}

Agent Coordinator: called when final_score is in ambiguous zone 0.40–0.65.
  Has 3s hard timeout; on timeout → rule engine pre-decision is used.
"""
import json
from openai import AsyncOpenAI
from app.config import settings

_client = AsyncOpenAI(
    api_key=settings.deepseek_api_key,
    base_url=settings.deepseek_base_url,
)

PARSE_STRATEGY_PROMPT = """
You are a trading strategy parser for an AI panda trading system.
Convert the user's natural language strategy into a structured JSON with these 4 layers:

{
  "philosophy": "trend_following|contrarian|intuition_driven|grid|custom",
  "position_sizing": {
    "type": "fixed|kelly|grid",
    "value": <number>
  },
  "signal_rules": [
    {"indicator": "RSI", "condition": "<30", "action": "BUY"},
    {"indicator": "MACD", "condition": "death_cross", "action": "SELL"}
  ],
  "risk_management": {
    "stop_loss_pct": <number>,
    "max_drawdown_pct": <number>
  }
}

Return ONLY valid JSON, no explanation.
"""


async def parse_strategy_text(raw_text: str) -> dict:
    """Parse natural language strategy to 4-layer structured JSON."""
    response = await _client.chat.completions.create(
        model=settings.deepseek_model,
        messages=[
            {"role": "system", "content": PARSE_STRATEGY_PROMPT},
            {"role": "user", "content": raw_text},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


async def agent_coordinator(context: dict, timeout: float = 3.0) -> dict:
    """LLM-based decision coordinator for ambiguous signals (0.40–0.65).

    Returns a dict with:
      - decision: BUY | SELL | HOLD
      - reasoning: short explanation (used for panda diary)
    """
    import asyncio
    prompt = f"""
You are the inner voice of a trading panda. Its final signal score is {context.get('final_score', 0.5):.2f}
(ambiguous zone). The panda's emotion is {context.get('emotion', 'focused')}.

Current market: {context.get('market_summary', 'unknown')}
Active strategy philosophy: {context.get('philosophy', 'unknown')}

Should the panda act? Reply with JSON: {{"decision": "BUY|SELL|HOLD", "reasoning": "one sentence"}}
"""
    try:
        response = await asyncio.wait_for(
            _client.chat.completions.create(
                model=settings.deepseek_model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            ),
            timeout=timeout,
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)
    except asyncio.TimeoutError:
        return {"decision": "HOLD", "reasoning": "Agent coordinator timeout — rule engine fallback"}

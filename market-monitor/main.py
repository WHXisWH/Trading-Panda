"""Market Monitor — stub until Phase 1 implementation (see docs/market-monitor-design.md)."""

from fastapi import FastAPI

app = FastAPI(title="TradingPanda Market Monitor")


@app.get("/health")
async def health() -> dict:
    return {"status": "stub", "message": "Implement DeepBook v3 feed per docs/market-monitor-design.md"}

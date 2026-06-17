# Market Monitor Design — Real Market Radar

> Last updated: 2026-06-17  
> Source of truth: `docs/PRD.md` v3.1  
> Role: convert real Sui market data into Panda-consumable market events.

---

## 1. Purpose

`market-monitor` is the market radar for TradingPanda. It does not trade, does not simulate, and does not listen to Panda ledger events. Its job is to observe real DeepBook market activity, aggregate it into clean market ticks, and publish those ticks to the Decision Engine and WebSocket Hub.

```text
DeepBook mainnet
→ market-monitor
→ Redis market:tick:{pair}
→ PandaActor
→ OrderIntent
```

The service exists so Panda decisions are driven by real Sui market data rather than CSV replay, synthetic prices, or sparse testnet pool fills.

---

## 2. Product Boundary

Market Monitor owns:

- Pool discovery.
- Trade / fill ingestion.
- OHLCV candle aggregation.
- Orderbook snapshot ingestion.
- Indicator calculation.
- Market regime classification.
- Redis publishing.
- REST historical candles.

Market Monitor does not own:

- Panda decisions.
- Policy checks.
- Paper ledger execution.
- PandaCoin demo execution.
- Agent Signer.
- Chain transaction submission.
- Skill Memory updates.

This boundary matters because the MVP has two execution tracks:

```text
Training truth = DeepBook mainnet prices from market-monitor
Chain proof = selected testnet PandaCoin PTBs from backend ChainExecutionWorker
```

---

## 3. Data Source Strategy

### 3.1 Primary Source

DeepBook is the primary market data source for MVP.

Preferred production direction:

```text
DeepBook mainnet Indexer / Server
→ order_fills / trades
→ orderbook
→ market-monitor aggregation
```

Current implementation supports:

- PostgreSQL `order_fills` as the OHLCV source.
- DeepBook Server HTTP `/orderbook/{pool}` for orderbook snapshots.
- Sui RPC pool discovery via `PoolCreated` events.
- Optional HTTP pool discovery fallback.

### 3.2 Priority Pairs

Product priority:

```text
SUI_USDC
DEEP_USDC
WAL_USDC
NS_USDC
```

Implementation may temporarily use existing configured pools while mainnet pair support is finalized:

```text
DEEP/SUI
SUI/DBUSDC
```

Do not describe sparse testnet pools as the source of Panda training truth.

Launch pairs should be selected by liquidity quality, not by brand preference. `market-monitor` should rank candidate DeepBook mainnet pools by:

| Signal | Why it matters |
|---|---|
| 24h and 7d fill volume | Confirms the Panda is watching markets with real activity |
| Bid/ask spread | Avoids training on prices that are too noisy to execute against |
| Orderbook depth near mid | Makes reference prices more realistic |
| Fresh 1m candles | Keeps the decision loop alive |
| Monitor health | Avoids pools with stale PG/orderbook data |
| Stable quote asset | Prefer USDC-style quotes for easier PnL comparison |

Recommended MVP ranking rule:

```text
eligible pair = enough recent fills + fresh candles + healthy orderbook
rank = volume_score + depth_score - spread_penalty + freshness_score
```

### 3.3 Future Auxiliary Sources

After DeepBook is stable, add venue adapters:

| Priority | Venue | Role |
|---|---|---|
| 1 | Cetus | First AMM reference source |
| 2 | Turbos | Second AMM reference source |
| 3 | Bluefin | Secondary price confirmation |
| 4 | FlowX | Aggregated quote reference |

Auxiliary venues should feed market quality signals such as divergence, liquidity, and route quality. They should not replace DeepBook in MVP.

---

## 4. Service Topology

```text
DeepBook Indexer / PG
  │ order_fills
  ▼
market-monitor
  ├── FillsClient
  ├── KlineAggregate
  ├── DeepBookClient / orderbook
  ├── IndicatorPipeline
  ├── MarketStateDetector
  └── RedisPublisher
        │
        ├── market:tick:{pair}
        └── market:heartbeat

Decision Engine
  └── MarketDataConsumer SUBSCRIBE market:tick:*

WebSocket Hub
  └── SUBSCRIBE market:tick:* and forward market.tick
```

---

## 5. Event Contract

### 5.1 `market:tick:{pair}`

Each tick should contain enough context for Panda decisions and charts to stay in sync:

```json
{
  "asset": "SUI",
  "pair": "SUI_USDC",
  "timestamp": 1715616005.0,
  "price": 3.2841,
  "prev_price": 3.28,
  "volume": 12500.5,
  "rsi": 52.34,
  "ma20": 3.265,
  "prev_ma20": 3.262,
  "macd_signal": false,
  "volatility": 0.035,
  "trend_strength": 0.62,
  "market_regime": "ranging",
  "funding_rate": 0.0,
  "orderbook_imbalance": 0.12,
  "source": "deepbook",
  "stale": false,
  "candle": {
    "open": 3.28,
    "high": 3.31,
    "low": 3.27,
    "close": 3.2841,
    "volume": 45.23,
    "interval": "1m"
  }
}
```

### 5.2 Publish Cadence

Current default:

```text
POLL_INTERVAL_SEC = 15
```

Behavior:

- Poll every `POLL_INTERVAL_SEC`.
- Publish when a new candle appears.
- Publish throttled `stale=true` ticks when no new candle exists.
- Publish `market:heartbeat` every `PUBLISH_HEARTBEAT_SEC`.

### 5.3 Historical Candles

REST:

```text
GET /candles?pool=SUI_USDC&interval=1m&limit=100
GET /candles/{pool:path}?interval=1m&limit=100
```

Default behavior:

- `interval=1m`.
- `limit=100`.
- `FILLS_LOOKBACK_SEC=30d`.
- Response returns the latest `limit` candles available inside lookback.

---

## 6. Health And Degradation

`GET /health` should expose:

- Service status.
- Current OHLCV source.
- Poll interval.
- Fills lookback.
- Redis connection.
- DeepBook reachability.
- PG reachability.
- Pool-specific last event and last publish timestamps.
- Pool-specific errors.

Common pool errors:

```text
pool_unresolved
no_fills_ever
no_fills_in_poll_window
insufficient_candles
orderbook_unavailable
```

Decision Engine should treat stale or degraded markets conservatively.

---

## 7. Mainnet vs Testnet

MVP product truth:

```text
Panda training and PnL use mainnet reference prices.
```

Testnet is used for:

- Panda NFT development deployments.
- PandaVault / TradingPolicy development.
- PandaCoin demo PTB execution.

Testnet DeepBook liquidity is not the source of truth for Panda performance.

---

## 8. Configuration

Important environment variables:

| Variable | Purpose |
|---|---|
| `DEEPBOOK_DATABASE_URL` | DeepBook Indexer PG containing `order_fills` |
| `DEEPBOOK_SERVER_URL` | DeepBook Server base URL for orderbook |
| `DEEPBOOK_POOLS` | Explicit pool allowlist |
| `SUI_RPC_URL` | Pool discovery only |
| `DEEPBOOK_PACKAGE_ID` | Package used for pool discovery |
| `REDIS_URL` | Redis TCP Pub/Sub URL |
| `POLL_INTERVAL_SEC` | Main polling cadence |
| `FILLS_POLL_LOOKBACK_SEC` | Tick aggregation lookback |
| `FILLS_LOOKBACK_SEC` | Historical candle lookback |
| `CANDLE_PERIOD` | Default candle interval |
| `OHLCV_LIMIT` | Default tick candle count |

---

## 9. Implementation Notes

Current code paths:

| File | Role |
|---|---|
| `market-monitor/main.py` | FastAPI app, `/health`, `/candles` |
| `market-monitor/monitor.py` | Polling loop and event creation |
| `market-monitor/feed/fills_client.py` | PG `order_fills` access |
| `market-monitor/pipeline/kline_aggregate.py` | Fill-to-candle aggregation |
| `market-monitor/pipeline/indicators.py` | RSI / MA / MACD / volatility |
| `market-monitor/pipeline/market_state.py` | bull / bear / ranging |
| `market-monitor/broadcast/publisher.py` | Redis publish |
| `market-monitor/broadcast/schemas.py` | MarketEvent schema |

Required PRD v3 follow-up:

- Rename product-facing language from "simulation ticks" to "market ticks" and "Panda events".
- Add `source` and optional venue metadata to `MarketEvent`.
- Promote mainnet pair configuration for `SUI_USDC`, `DEEP_USDC`, `WAL_USDC`, and `NS_USDC` when available.
- Keep existing testnet pool support as development fallback only.

---

## 10. Explicit Non-Goals

- Do not execute trades from `market-monitor`.
- Do not submit PTBs from `market-monitor`.
- Do not listen to Panda simulation / ledger data.
- Do not treat DeepBook testnet fills as training truth.
- Do not couple Decision Engine tests to real DeepBook availability.

# Market Monitor

独立 **DeepBook Server API** 行情服务（方案 B）。

- 设计：`docs/market-monitor-design.md`
- 部署：`render.yaml` → `trading-panda-market-monitor`
- 发布 Redis：`market:tick:{pair}`（`MarketEvent` JSON）

## 前置条件

1. 本地 DeepBook **Indexer + Server**（见 `docs/deepbook-v3-server-local-deployment.md`）
2. **Upstash Redis**（`REDIS_URL`，见下）

### Upstash 两种凭据（勿混用）

| 变量 | 谁用 | 说明 |
|------|------|------|
| `REDIS_URL=rediss://…` | **market-monitor、backend** | 控制台 **Redis → Connect → Python** 里的 TCP 连接串 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | **CF WebSocket Hub** | 控制台 **REST API**；**不能**代替 `REDIS_URL` |

`redis-py` 的 `PUBLISH` / `SUBSCRIBE` 需要 `rediss://`，REST Token 无法直接给 Python Pub/Sub 使用。

## 本地运行

```bash
cp .env.example .env
# 填写 DEEPBOOK_SERVER_URL、REDIS_URL

pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

```bash
curl http://localhost:8001/health
```

## 目录结构

```
market-monitor/
├── main.py                 # FastAPI + lifespan 启动轮询
├── config.py               # 环境变量
├── monitor.py              # 轮询编排
├── feed/
│   ├── deepbook_client.py  # GET /get_pools, /ohclv, /orderbook, /trades
│   └── orderbook.py        # 订单簿不平衡度
├── pipeline/
│   ├── indicators.py       # RSI / MA20 / MACD / 波动率
│   └── market_state.py     # bull / bear / ranging
├── broadcast/
│   ├── schemas.py          # MarketEvent（对齐 agent-design）
│   └── publisher.py        # PUBLISH market:tick:{pair}
└── tests/                  # 8 个单元测试
```

## 行为说明

1. 按 `POLL_INTERVAL_SEC` 轮询 DeepBook Server（**不**调 Sui RPC）
2. 每个池：`/ohclv` → 算指标 → `/orderbook` → 拼 `MarketEvent`
3. 新 K 线或 `stale` 节拍时 `PUBLISH` 到 `market:tick:{pair}`
4. 定期 `market:heartbeat`（默认 30s）
5. `GET /health` 返回 DeepBook / Redis / 各池状态

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPBOOK_SERVER_URL` | 如 `http://localhost:9008` |
| `DEEPBOOK_POOLS` | 可选，逗号分隔；留空则 `GET /get_pools` |
| `REDIS_URL` | `redis://` 或 `rediss://`（Upstash 用控制台 Python 连接串） |
| `POLL_INTERVAL_SEC` | 轮询间隔，默认 `2` |
| `CANDLE_PERIOD` | K 线周期，默认 `1m` |
| `OHLCV_LIMIT` | 拉取 K 线根数，默认 `60` |

## 测试

```bash
cd market-monitor
PYTHONPATH=. pytest -q
```

`tests/` 下为**单元测试**：不连接真实 DeepBook Server、不连接 Redis，只验证核心纯函数逻辑。

### 与运行时的关系

```text
DeepBook API 响应 → deepbook_client 解析 → indicators / orderbook / market_state
→ schemas 命名 → 组装 MarketEvent → publisher 发 Redis
```

测试覆盖的是中间几段「纯函数」；轮询循环与 Redis 发布见下文「未覆盖范围」。

### `tests/test_schemas.py` — 交易对命名

测 **DeepBook 池名 → Redis 频道用的 `pair` / `asset`**（`broadcast/schemas.py`）。

| 测试 | 含义 |
|------|------|
| `test_pool_pair_asset` | `SUI_USDC` → `SUI-USDC`（`pool_to_pair`）；`SUI-USDC` → `SUI`（`pair_to_asset`） |

DeepBook 返回池名多为下划线（`SUI_USDC`），Redis 频道为 `market:tick:SUI-USDC`；转错会导致 DE 订错频道。

### `tests/test_deepbook_client.py` — API 响应解析

测 **HTTP JSON 解析**（`feed/deepbook_client.py`），不发起真实请求。

| 测试 | 含义 |
|------|------|
| `test_parse_pools_list` | `/get_pools` 返回 `["SUI_USDC", "DEEP_USDC"]` 时能正确得到池列表 |
| `test_parse_candles` | `/ohclv` 返回含 `open_time`（毫秒）、OHLCV 字段时，能转成 `Candle`（`close=1.05`，时间戳转为秒） |

保证 K 线不为空，后续 `compute_indicators` 才能执行。

### `tests/test_indicators.py` — 技术指标

测 **`pipeline/indicators.py`** 的 `compute_indicators()`。

| 辅助 / 测试 | 含义 |
|-------------|------|
| `_candles(30)` | 构造 30 根上涨假 K 线 |
| `test_compute_indicators_uptrend` | 数据足够时能算出指标；最新价 > 上一根价；MA20 > 0；RSI 在 0–100 |
| `test_insufficient_candles` | 仅 1 根 K 线时返回 `None`（不硬算） |

对应 `monitor.py` 每轮把 RSI、MA20、MACD 等写入 `MarketEvent`。

### `tests/test_orderbook.py` — 订单簿不平衡度

测 **`feed/orderbook.py`** 的 `orderbook_imbalance()`（结果写入 `MarketEvent.orderbook_imbalance`）。

| 测试 | 含义 |
|------|------|
| `test_balanced_book` | 买卖盘总量相等 → 不平衡度 `0` |
| `test_bid_heavy` | 买盘明显多于卖盘 → 不平衡度 `> 0` |

验证 `bids` / `asks` 为 `[[价, 量], ...]` 格式时的解析。

### `tests/test_market_state.py` — 市场状态

测 **`pipeline/market_state.py`** 的 `detect_regime()` → `bull` / `bear` / `ranging`。

| 测试 | 含义 |
|------|------|
| `test_ranging_low_trend` | 价格≈均线、趋势很弱、RSI 中性 → `ranging`（震荡） |

对应 `MarketEvent.market_regime`，供 DE 判断大环境。

### 未覆盖范围

| 模块 | 说明 |
|------|------|
| `monitor.py` 轮询循环 | 需 mock HTTP + Redis 的集成测试 |
| `broadcast/publisher.py` | 需 Redis 或 fakeredis |
| `main.py` `/health` | 需 FastAPI TestClient + lifespan |
| 真实 DeepBook Server | 本地起 Server 后手工或 E2E 验证 |

当前 8 个测试覆盖 **命名、解析、指标、盘口、市场状态** 等 MVP 核心纯逻辑。

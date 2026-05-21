# Market Monitor

独立行情服务（方案 B）。**方案甲（MVP）**：OHLCV 自 DeepBook PG **`order_fills`** 聚合（**不用** `/ohclv`）；盘口仍走 Server HTTP；`PUBLISH market:tick:*` 供 **DE + CF WebSocket Hub**（前端 K 线与决策同源）。

- 设计：`docs/market-monitor-design.md`
- 部署：**VPS 与 PG 同机推荐**；`render.yaml` 可作过渡
- Redis：`market:tick:{pair}`；历史 K 线 REST：`GET /candles/{pool}`

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
curl "http://localhost:8001/candles/DEEP/SUI?interval=1m&limit=100"
# 或（避免路径里的 /）：curl "http://localhost:8001/candles?pool=DEEP/SUI&limit=100"
```

## 目录结构

```
market-monitor/
├── main.py                 # FastAPI + lifespan 启动轮询
├── config.py               # 环境变量
├── monitor.py              # 轮询编排
├── feed/
│   ├── deepbook_client.py  # GET /orderbook（盘口）
│   ├── fills_client.py     # PG order_fills → OHLCV
│   ├── kline_aggregate.py  # fills → candles
│   ├── sui_pool_client.py  # suix_queryEvents → PoolCreated → 池名 SUI_USDC
│   └── orderbook.py        # 订单簿不平衡度
├── pipeline/
│   ├── indicators.py       # RSI / MA20 / MACD / 波动率
│   └── market_state.py     # bull / bear / ranging
├── broadcast/
│   ├── schemas.py          # MarketEvent（对齐 agent-design）
│   └── publisher.py        # PUBLISH market:tick:{pair}
└── tests/                  # 单元测试（pytest）
```

## 行为说明

1. **解析池列表**：`DEEPBOOK_POOLS` 非空则用之（MVP 推荐 `DEEP/SUI,SUI/DBUSDC`）；否则 Sui RPC + 可选 `GET /get_pools`。
2. 每 **`POLL_INTERVAL_SEC`**（默认 **15s**，testnet 够用）：用 **`FILLS_POLL_LOOKBACK_SEC`**（默认 72h）读 PG `order_fills` 聚 K 线；再 `GET /orderbook`（池名 URL 编码）。
3. 每个池：OHLCV → 指标（需 ≥2 根 K 线）→ 盘口 → `MarketEvent`。
4. 新 K 线或 `stale` 时节流 `PUBLISH market:tick:{pair}`。
5. 定期 `market:heartbeat`（默认 30s）。
6. **`GET /candles/{pool}`**：用 **`FILLS_LOOKBACK_SEC`**（默认 30d）供前端历史图；**勿**依赖 DeepBook `/ohclv`（常为空）。
7. **`GET /health`**：含 `fills_poll_lookback_sec`、各池 `error`（`no_fills_ever` / `no_fills_in_poll_window` 等）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPBOOK_DATABASE_URL` | DeepBook Indexer 库（`order_fills`），如 `postgresql://…@127.0.0.1:5433/deepbook` |
| `DEEPBOOK_SERVER_URL` | 如 `http://localhost:9008`（盘口） |
| `DEEPBOOK_POOLS` | 可选，逗号分隔；**最高优先级**，留空则走 Sui + 可选 HTTP 回退 |
| `SUI_RPC_URL` | 全节点 JSON-RPC，默认 `https://fullnode.testnet.sui.io:443`；主网请改 |
| `DEEPBOOK_PACKAGE_ID` | DeepBook Move 包地址，默认 `0xdee9`（与网络一致） |
| `DEEPBOOK_POOL_MODULE` | 含 `PoolCreated` 的模块名，默认 `pool` |
| `USE_SUI_RPC_FOR_POOLS` | 默认 `true` |
| `USE_HTTP_GET_POOLS_FALLBACK` | Sui 无结果时是否再调 `GET /get_pools`，默认 `true` |
| `REDIS_URL` | `redis://` 或 `rediss://`（Upstash 用控制台 Python 连接串） |
| `DEEPBOOK_DATABASE_URL` | DeepBook Indexer 库（**方案甲必填**） |
| `PRICE_SCALE` / `QTY_SCALE` | 链上整数价量缩放，默认 `1e9` |
| `USE_OHLCV_FALLBACK` | `true` 时回退 `GET /ohclv`（无 PG 时） |
| `ORDERBOOK_DEPTH` | `/orderbook` 深度档数，默认 `10` |
| `ORDERBOOK_LEVEL` | `2` = 多档 Level2（与 Server 一致） |
| `POLL_INTERVAL_SEC` | 主循环间隔，默认 **15**（与 PG 回溯无关） |
| `FILLS_POLL_LOOKBACK_SEC` | 轮询 tick 读 PG 的时间深度，默认 **259200**（72h） |
| `FILLS_LOOKBACK_SEC` | `GET /candles` 历史深度，默认 **2592000**（30d） |
| `CANDLE_PERIOD` | K 线周期，默认 `1m` |
| `OHLCV_LIMIT` | 返回 K 线根数上限，默认 `60` |

## 测试

### 手动联调（DeepBook + Redis）

用于验证：**从 DeepBook Server 拉行情**、**向 Redis 发布 `market:tick:*`**。单元测试 `pytest` 不覆盖此路径，需本机或联调环境手动跑通。

#### 0. 前置

| 组件 | 要求 |
|------|------|
| **DeepBook** | Indexer + PostgreSQL + Server 已启动，`DEEPBOOK_SERVER_URL` 可访问（如 `http://localhost:9008`） |
| **Redis** | `REDIS_URL` 为 **`redis://` / `rediss://` 的 TCP 连接串**（Upstash：**Redis → Connect → Python**）；**不要**把 `UPSTASH_REDIS_REST_*` 当成 `REDIS_URL` |

自检 DeepBook（池名换成 `get_pools` 里真实项）：

```bash
curl -sS "http://localhost:9008/get_pools"
curl -sS "http://localhost:9008/orderbook/DEEP%2FSUI?depth=10&level=2"
```

**K 线来自 PG `order_fills`**（设 `DEEPBOOK_DATABASE_URL`），不是 `/ohclv`。验收：

```bash
curl -sS "http://localhost:8001/candles/DEEP/SUI?limit=20"
# 或：curl -sS "http://localhost:8001/candles?pool=DEEP/SUI&limit=20"
curl -sS http://localhost:8001/health   # DEEP/SUI 的 last_publish_ts 非 null
```

#### 1. 配置

```bash
cd market-monitor
cp .env.example .env
```

在 `.env` 中至少填写 `DEEPBOOK_SERVER_URL`、`REDIS_URL`。可选：

- **`DEEPBOOK_POOLS`** — 逗号分隔，固定池列表，便于排错（最高优先级）。
- 若只想用 HTTP 枚举池、暂不关心 Sui：**`USE_SUI_RPC_FOR_POOLS=false`** + **`USE_HTTP_GET_POOLS_FALLBACK=true`**。

#### 2. 启动服务

```bash
cd market-monitor
pip install -r requirements.txt
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8001
```

#### 3. 验证 DeepBook 连通与轮询 — `GET /health`

```bash
curl -sS http://localhost:8001/health | python3 -m json.tool
```

| 字段 | 含义 |
|------|------|
| `deepbook_reachable` | 能否访问 DeepBook Server |
| `redis_connected` | 是否已连接 Redis；`false` 时不会发布 tick |
| `pools` | 各池 `last_event_ts` / `last_publish_ts`；有值说明已拉到过 OHLCV 并跑过发布逻辑 |
| `status` | 理想为 `ok`；DeepBook 不可达等可能为 `degraded` |

可与 DeepBook 对照：

```bash
curl -sS "http://localhost:9008/ohclv/<池名>?period=1m&limit=3"
```

#### 4. 验证 Redis 发布

| 频道 | 说明 |
|------|------|
| `market:tick:{pair}` | 行情 tick；`pair` 为 **`BASE-QUOTE`**（横杠），如池 `SUI_USDC` → **`market:tick:SUI-USDC`** |
| `market:heartbeat` | 心跳（默认约每 30s） |

**方式 A — `redis-cli`**

```bash
redis-cli -u "$REDIS_URL"
```

进入后：

```
PSUBSCRIBE market:*
```

或只盯单一交易对：`SUBSCRIBE market:tick:SUI-USDC`

**方式 B — 临时 Python 监听**（需已 `pip install redis`，且 shell 中已 `export REDIS_URL`）

```bash
cd market-monitor
PYTHONPATH=. python3 -c "
import asyncio, os, redis.asyncio as r
async def main():
    c = r.from_url(os.environ['REDIS_URL'], decode_responses=True)
    p = c.pubsub()
    await p.psubscribe('market:*')
    async for msg in p.listen():
        if msg['type'] == 'pmessage':
            print(msg['channel'], msg['data'][:240])
asyncio.run(main())
"
```

#### 5. 常见现象

1. **`redis_connected: false`**：`REDIS_URL` 未填或 TLS/网络错误；日志会有 “ticks will not be published”。
2. **收不到 `market:tick:*`**：多为 **OHLCV 为空**（Indexer 未同步、周期或池名错误）。
3. **订错频道**：须用横杠 pair（`SUI-USDC`），不是下划线池名。
4. **tick 很稀**：同一根 K 线会去重/节流 stale；可观察 `market:heartbeat` 是否在更新。

#### 6. 最小验收

1. `get_pools` 与至少一条 `ohlcv` 在外部 `curl` 下正常、非空。
2. `/health` 中 `deepbook_reachable` 与 `redis_connected` 为 `true`，且 `pools` 内至少一池出现 `last_publish_ts`。
3. `PSUBSCRIBE market:*` 能收到 **`market:tick:*`**（及可选 **`market:heartbeat`**）。

---

### 单元测试（pytest）

```bash
cd market-monitor
PYTHONPATH=. pytest -q
```

`tests/` 下为**单元测试**：不连接真实 DeepBook Server、不连接 Redis，只验证核心纯函数逻辑。

### 与运行时的关系

```text
Sui RPC（池发现）→ 池名列表
DeepBook API 响应 → deepbook_client 解析 → indicators / orderbook / market_state
→ schemas 命名 → 组装 MarketEvent → publisher 发 Redis
```

测试覆盖 **Sui 事件类型解析**、HTTP 解析、指标、盘口、市场状态等纯函数；轮询与 Redis 发布见「未覆盖范围」。

### `tests/test_schemas.py` — 交易对命名

测 **DeepBook 池名 → Redis 频道用的 `pair` / `asset`**（`broadcast/schemas.py`）。

| 测试 | 含义 |
|------|------|
| `test_pool_pair_asset` | `SUI_USDC` → `SUI-USDC`（`pool_to_pair`）；`SUI-USDC` → `SUI`（`pair_to_asset`） |

DeepBook 返回池名多为下划线（`SUI_USDC`），Redis 频道为 `market:tick:SUI-USDC`；转错会导致 DE 订错频道。

### `tests/test_sui_pool_client.py` — Sui 池发现

测 **`feed/sui_pool_client.py`**：`PoolCreated` 事件 `type` 字符串中泛型参数 → `SUI_USDC` 格式；`_split_top_level_types` 处理嵌套 `<>`；`normalize_pool_list`；对 `_sui_rpc` 打桩的 `discover_pools_via_rpc` 冒烟。

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
| 真实 DeepBook Server | 本地起 Server 后按 `README.md` **「手动联调（DeepBook + Redis）」** 验证，或后续补 E2E |

当前 **14** 个测试覆盖 **Sui 池解析、HTTP 解析、指标、盘口、市场状态、命名** 等 MVP 核心纯逻辑。

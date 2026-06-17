# Market Monitor

独立行情服务（方案 B）。**方案甲（MVP）**：OHLCV 自 DeepBook PG **`order_fills`** 聚合（**不用** `/ohclv`）；盘口仍走 Server HTTP；`PUBLISH market:tick:*` 供 **DE + CF WebSocket Hub**（前端 K 线与决策同源）。

- 设计：`docs/market-monitor-design.md`
- 部署：**VPS 与 PG 同机推荐**；`render.yaml` 可作过渡
- Redis：`market:tick:{pair}`；历史 K 线 REST：`GET /candles/{pool:path}` 或 `GET /candles?pool=`

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
7. **`GET /health`**：含 `network`、`ranked_pairs`、各池 `health`/`freshness_sec`/`error`。
8. **`GET /pairs`**：流动性排名与 pair metadata（volume、spread、depth、launch priority）。

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
| `PRICE_SCALE` / `QTY_SCALE` | 链上整数价量缩放，默认 `1e9` |
| `USE_OHLCV_FALLBACK` | `true` 时回退 `GET /ohclv`（无 PG 时） |
| `ORDERBOOK_DEPTH` | `/orderbook` 深度档数，默认 `10` |
| `ORDERBOOK_LEVEL` | `2` = 多档 Level2（与 Server 一致） |
| `POLL_INTERVAL_SEC` | 主循环间隔，默认 **15**（与 PG 回溯无关） |
| `FILLS_POLL_LOOKBACK_SEC` | 轮询 tick 读 PG 的时间深度，默认 **259200**（72h） |
| `FILLS_LOOKBACK_SEC` | `GET /candles` 历史深度，默认 **2592000**（30d） |
| `CANDLE_PERIOD` | K 线周期，默认 `1m` |
| `OHLCV_LIMIT` | 返回 K 线根数上限，默认 `60` |

## 测试与验收

按 **步骤 0 → 6** 顺序执行。全部通过即可认为 **market-monitor 正常工作**（能读 PG 聚 K 线、拉盘口、发 Redis tick、提供 REST 历史 K 线）。

> **池名约定**：DeepBook Server 使用 `DEEP/SUI`（斜杠）。本服务 REST 用 **`/candles/DEEP/SUI`** 或 **`/candles?pool=DEEP/SUI`**；DeepBook 盘口 API 仍须 **`DEEP%2FSUI`** 编码。  
> **Redis 频道**：`pair = pool_to_pair(pool)`，仅把下划线换成横杠，如 `SUI/DBUSDC` → `SUI/DBUSDC`，`SUI_USDC` → `SUI-USDC`。

---

### 步骤 0 — 推荐 `.env`（MVP / testnet）

```bash
DEEPBOOK_DATABASE_URL=postgresql://…@<host>:5433/deepbook
DEEPBOOK_SERVER_URL=http://<host>:9008
REDIS_URL=rediss://default:…@….upstash.io:6379
DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC
POLL_INTERVAL_SEC=15
FILLS_POLL_LOOKBACK_SEC=259200
FILLS_LOOKBACK_SEC=2592000
```

| 检查项 | 说明 |
|--------|------|
| `DEEPBOOK_DATABASE_URL` | **必填**（方案甲）；无则无法从 `order_fills` 聚 K 线 |
| `DEEPBOOK_POOLS` | 建议只写有成交的池；`NO_MARKET/SUI` 等无 fill 会一直报错 |
| 勿用 `/ohclv` 验收 | DeepBook `GET /ohclv/...` 常返回 `{"candles":[]}`，与 monitor 无关 |

**外部依赖自检**（在启动 monitor 前）：

```bash
# Server 可达 + 池列表
curl -sS "http://<DEEPBOOK_HOST>:9008/get_pools" | python3 -m json.tool

# 盘口（注意 URL 编码斜杠）
curl -sS "http://<DEEPBOOK_HOST>:9008/orderbook/DEEP%2FSUI?depth=10&level=2" | python3 -m json.tool
# 期望：HTTP 200，JSON 含非空 "bids" 或 "asks"
```

---

### 步骤 1 — 单元测试（无外部依赖）

```bash
cd market-monitor
pip install -r requirements.txt
PYTHONPATH=. pytest -q
```

**期望**：`29 passed`（或更多），无 FAILED。不连接真实 PG / Redis / DeepBook。

---

### 步骤 2 — 启动服务

```bash
cd market-monitor
cp .env.example .env   # 首次
# 编辑 .env 后：
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8001
```

**期望日志**（示例）：

```text
INFO:feed.fills_client:order_fills schema pool=pool_id id=None
INFO:main:Market monitor started pg=True deepbook=http://…:9008 poll=15.0s
INFO:     Application startup complete.
```

启动后等待 **≥1 个 `POLL_INTERVAL_SEC`**（默认 15s），再执行步骤 3–6。

---

### 步骤 3 — `GET /health`

```bash
curl -sS http://localhost:8001/health | python3 -m json.tool
```

#### 期望（正常）

| 字段 | 期望值 | 含义 |
|------|--------|------|
| `status` | `"ok"` | PG 或 DeepBook 至少一侧可用，且 Redis 已连接 |
| `ohlcv_source` | `"order_fills"` | 使用 PG 聚合（未开 `USE_OHLCV_FALLBACK`） |
| `deepbook_reachable` | `true` | 能 ping DeepBook Server |
| `deepbook_database_configured` | `true` | 已配置 `DEEPBOOK_DATABASE_URL` |
| `pg_ok` | `true` | 能连上 PG 且存在 `order_fills` 表 |
| `redis_connected` | `true` | 已连接 Upstash；`false` 则**不会**发布 tick |
| `poll_interval_sec` | `15`（或你的配置） | 主循环间隔 |
| `fills_poll_lookback_sec` | `259200` 等 | tick 读 PG 深度 |
| `pools` | 每个配置的池一条 | 见下表 |

**`pools` 内单池期望（以 `DEEP/SUI` 为例，运行约 15–30s 后）**：

| 字段 | 期望 | 说明 |
|------|------|------|
| `pool` | `"DEEP/SUI"` | 与 `DEEPBOOK_POOLS` 一致 |
| `last_event_ts` | 数字（Unix 秒） | 最后一根 K 线桶时间 |
| `last_publish_ts` | 数字（Unix 秒） | 最近一次 `PUBLISH market:tick:*` |
| `error` | `null` | 非空见下方「错误码」 |

**示例片段**（字段随环境略有不同）：

```json
{
  "status": "ok",
  "ohlcv_source": "order_fills",
  "poll_interval_sec": 15,
  "fills_poll_lookback_sec": 259200,
  "fills_lookback_sec": 2592000,
  "deepbook_reachable": true,
  "pg_ok": true,
  "redis_connected": true,
  "pools": {
    "DEEP/SUI": {
      "pool": "DEEP/SUI",
      "last_event_ts": 1779360000,
      "last_publish_ts": 1779361027.9,
      "error": null
    },
    "SUI/DBUSDC": {
      "pool": "SUI/DBUSDC",
      "last_event_ts": 1779356400,
      "last_publish_ts": 1779361031.8,
      "error": null
    }
  }
}
```

#### `pools[].error` 常见取值

| `error` | 含义 | 处理 |
|---------|------|------|
| `null` | 正常 | — |
| `no_fills_ever: …` | PG 中该池无任何成交 | 换池或等 Indexer 同步 |
| `no_fills_in_poll_window: …` | 回溯窗口内无成交 | 增大 `FILLS_POLL_LOOKBACK_SEC` 或等成交 |
| `insufficient_candles: need >=2 bars, got 1` | 成交太少 | 换活跃池或拉长回溯 |
| `pool_unresolved: …` | 池名无法映射 `pool_id` | 检查 `get_pools` / `DEEPBOOK_POOLS` |

#### 异常 HTTP / 字段

| 情况 | 说明 |
|------|------|
| `{"status":"starting"}` | 刚启动，lifespan 未就绪；几秒后重试 |
| `status: "degraded"` | `redis_connected: false` 或 PG/DeepBook 均不可用 |
| `last_publish_ts` 长期 `null` | 见上表 `error`；或尚未等满一轮轮询 |

---

### 步骤 4 — `GET /candles`（历史 K 线 REST）

池名含 `/` 时，**任选一种** URL（不要用单段 `DEEP%2FSUI` 路径访问本服务，可能路由 404）：

```bash
# 方式 A：路径（推荐）
curl -sS "http://localhost:8001/candles/DEEP/SUI?interval=1m&limit=20" | python3 -m json.tool

# 方式 B：查询参数（BFF / 浏览器友好）
curl -sS "http://localhost:8001/candles?pool=DEEP/SUI&interval=1m&limit=20" | python3 -m json.tool
```

#### 期望 HTTP 200

```json
{
  "pool": "DEEP/SUI",
  "pair": "DEEP/SUI",
  "interval": "1m",
  "candles": [
    {
      "t": 1779356400,
      "o": 31.37,
      "h": 31.52,
      "l": 31.37,
      "c": 31.52,
      "v": 0.02
    }
  ]
}
```

| 字段 | 期望 |
|------|------|
| `candles` | **非空数组**；`limit=20` 时长度 ≤ 20 |
| 每根 `t` | Unix **秒**（整数） |
| `o/h/l/c/v` | 浮点数；价格为缩放后的浮点（`PRICE_SCALE`） |

对 **`SUI/DBUSDC`** 再执行一次，同样应 **200 + 非空 `candles`**。

#### 期望 HTTP 错误（便于区分）

| 请求 | HTTP | `detail` 示例 | 原因 |
|------|------|---------------|------|
| `GET /candles/DEEP/SUI`（旧进程未重启） | 404 | `"Not Found"` | 路由未更新；需重启 uvicorn |
| `GET /candles/NO_MARKET/SUI`（无成交池） | 404 | `"no candle data for pool='NO_MARKET/SUI'"` | PG 无数据，属数据问题非路由 |
| 服务未就绪 | 503 | `"monitor not ready"` | 启动失败或正在 starting |

---

### 步骤 5 — Redis `market:tick:*`

先订阅（终端 A）：

```bash
# 需本机可访问 REDIS_URL（Upstash 用 rediss://）
redis-cli -u "$REDIS_URL" PSUBSCRIBE 'market:*'
```

或使用 Python（`export REDIS_URL=…` 后）：

```bash
cd market-monitor
PYTHONPATH=. python3 -c "
import asyncio, os, json, redis.asyncio as r
async def main():
    c = r.from_url(os.environ['REDIS_URL'], decode_responses=True)
    p = c.pubsub()
    await p.psubscribe('market:*')
    async for msg in p.listen():
        if msg['type'] == 'pmessage':
            ch, raw = msg['channel'], msg['data']
            d = json.loads(raw)
            print(ch, 'price=', d.get('price'), 'regime=', d.get('market_regime'), 'stale=', d.get('stale'))
asyncio.run(main())
"
```

终端 B 保持 monitor 运行，等待 **15–60 秒**。

#### 期望

| 频道 | 期望 |
|------|------|
| `market:tick:DEEP/SUI` | 周期性出现（有 K 线后；stale 时可能隔 `~2×POLL_INTERVAL_SEC` 才一条） |
| `market:tick:SUI/DBUSDC` | 同上 |
| `market:heartbeat` | 约每 **30s** 一条（`publish_heartbeat_sec`） |

**单条 `market:tick` JSON 应包含**（节选）：

```json
{
  "asset": "DEEP",
  "pair": "DEEP/SUI",
  "price": 30.99,
  "prev_price": 31.52,
  "rsi": 45.12,
  "ma20": 31.1,
  "market_regime": "ranging",
  "orderbook_imbalance": 0.15,
  "candle": {
    "open": 30.99,
    "high": 30.99,
    "low": 30.99,
    "close": 30.99,
    "volume": 0.01,
    "interval": "1m"
  },
  "stale": true
}
```

| 字段 | 说明 |
|------|------|
| `stale: true` | testnet 久无新成交时常见；表示沿用上一根 K 线，**仍属正常** |
| 无消息 | 查 `/health` 的 `redis_connected` 与各池 `error` |

---

### 步骤 6 — 最小验收清单

在本地或 VPS 上勾选：

- [ ] `pytest -q` 全部通过  
- [ ] `GET /health` → `status=ok`，`pg_ok=true`，`redis_connected=true`  
- [ ] `DEEP/SUI`、`SUI/DBUSDC` 的 `last_publish_ts` **非 null**，`error` **null**  
- [ ] `GET /candles/DEEP/SUI?limit=20` → **200**，`candles` 非空  
- [ ] `PSUBSCRIBE market:*` 能收到 **`market:tick:DEEP/SUI`**（及 heartbeat）  

以上五项同时满足 → **服务可认为正常工作**，可接 Decision Engine 与前端 BFF。

---

### 单元测试说明（pytest）

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

另含 `test_fills_lookback.py`、`test_candles_route.py` 等。当前约 **30** 项，覆盖 **Sui 池解析、HTTP 解析、PG 回溯窗口、指标、盘口、路由** 等逻辑。

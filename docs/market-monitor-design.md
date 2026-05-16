# Market Monitor — 独立市场监听服务（方案 B）

> **架构决策（已锁定）**：DeepBook 行情采集、K 线重建、技术指标计算从 Decision Engine **拆分为独立进程** `market-monitor/`。  
> 数据源：**DeepBook v3**（Sui 链上 CLOB，经 Sui Fullnode RPC / 事件轮询，无官方公有 REST API）。  
> 下游：经 **Upstash Redis Pub/Sub** 向 Decision Engine、WebSocket Hub 广播。  
> **最后更新**：2026-05-16

---

## 1. 为什么独立（方案 B）

| 耦合在 DE 内（方案 A） | 独立 `market-monitor`（方案 B，当前） |
|------------------------|-------------------------------------|
| DE 重启 = 行情断流 | 监听可单独重启，DE 仍可用缓存/最后一拍 |
| RPC 抖动拖慢 Actor 事件循环 | Sui I/O 与决策计算分进程隔离 |
| 无法按交易对单独扩容 | 可按 Pool 分 Task / 多实例 shard |
| 测试决策要起整套 DeepBook 采集 | DE 测试可 mock Redis 消息 |

调研原文（Obsidian，不随 Git 版本管理）：  
`…/research/deepbook-integration-research.md`

---

## 2. 服务拓扑

```
DeepBook v3（Sui Testnet/Mainnet）
        │  suix_queryEvents / suix_subscribeEvent（只读，MVP 无需 gas）
        ▼
┌───────────────────────────────────────────┐
│  market-monitor/  （Python · Render）      │
│  · DeepBook v3 事件轮询（主）              │
│  · KlineBuilder → OHLCV                   │
│  · TechnicalIndicators → MarketEvent        │
│  · PUBLISH → Upstash Redis                │
│  GET /health                              │
└───────────────────┬───────────────────────┘
                    │  Redis Pub/Sub
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│ Decision Engine   │   │ WebSocket Hub (CF) │
│ MarketDataConsumer│   │ 订阅 candle/tick   │
│ → PandaActor      │   │ → simulation.tick  │
└───────────────────┘   └───────────────────┘
```

**Decision Engine 不再**内嵌 `data_feed.py` 轮询 Sui；仅 **订阅 Redis** 并 `broadcast_market_tick()`。

---

## 3. 仓库目录（规划）

```
market-monitor/
├── main.py              # 启动轮询 + /health
├── config.py            # SUI_NETWORK, POOL_IDS, REDIS_URL, 轮询间隔
├── feed/
│   ├── deepbook_feed.py # DeepBook v3 OrderFilled 等
│   ├── event_poller.py
│   └── orderbook.py     # 可选：订单簿快照 → orderbook_imbalance
├── pipeline/
│   ├── kline_builder.py
│   ├── indicators.py
│   └── market_state.py  # bull / bear / ranging
├── broadcast/
│   ├── publisher.py     # redis.publish
│   └── schemas.py         # MarketEvent JSON 契约
└── tests/
```

实现状态：**目录与契约以本文为准；代码随 Phase 1 落地**（见 §8）。

---

## 4. DeepBook v3 要点（替代 v2 `clob_v2`）

| 项目 | 值 |
|------|-----|
| Package | `0xdee9` |
| 模块 | `deepbook`（非 `clob_v2`） |
| 成交事件 | `0xdee9::deepbook::OrderFilled` |
| 其他 | `OrderPlaced`, `OrderCancelled`, `SwapEvent`, `PoolCreated` |

```python
# 事件类型（实现须与此一致）
EVENT_TYPES_V3 = [
    "0xdee9::deepbook::OrderFilled",
    "0xdee9::deepbook::OrderPlaced",
    "0xdee9::deepbook::OrderCancelled",
    "0xdee9::deepbook::SwapEvent",
    "0xdee9::deepbook::PoolCreated",
]
```

**价格/数量**：链上整数 ÷ `1e9`（以实现解析字段名为准，如 `price`、`base_asset_qty`）。

**MVP 数据路径**：`httpx` + Sui JSON-RPC（`suix_queryEvents`），**不**依赖 DeepBook 自托管 Indexer Server；**不**在 MVP 链上下真实单（只读）。

**Pool ID**：测试网/主网不同，通过 `PoolCreated` 事件或环境变量 `DEEPBOOK_POOL_IDS` 配置。

---

## 5. Redis 频道与消息契约

与 `docs/redis-architecture.md` 对齐；**发布方改为 Market Monitor**。

### 5.1 主频道（Decision Engine 必订）

| Channel | 频率 | 订阅方 | 说明 |
|---------|------|--------|------|
| `market:tick:{pair}` | 每根新 K 线或决策节拍（如 30–60s，可配置） | **DE** `MarketDataConsumer`、可选 Hub | **完整 `MarketEvent`**（含指标） |

`{pair}` 示例：`SUI-USDC`（与 DB `asset` 映射：`SUI` ↔ `SUI-USDC`）。

**Payload（`MarketEvent`）** — 与 `docs/agent-design.md` 一致：

```json
{
  "asset": "SUI",
  "pair": "SUI-USDC",
  "timestamp": 1715616005.0,
  "price": 3.2841,
  "prev_price": 3.2800,
  "volume": 12500.5,
  "rsi": 52.34,
  "ma20": 3.2650,
  "prev_ma20": 3.2620,
  "macd_signal": false,
  "volatility": 0.035,
  "trend_strength": 0.62,
  "market_regime": "ranging",
  "funding_rate": 0.0,
  "orderbook_imbalance": 0.12,
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

> `candle` 可选嵌入同一消息，便于 Hub 转发为 `simulation.tick` 时少一次拼装。

### 5.2 辅助频道（可选，调试 / 高频）

| Channel | 用途 |
|---------|------|
| `market:fill:{pair}` | 单笔 `OrderFilled` 原始归一化（高频） |
| `market:candles:1m:{pair}` | 仅 OHLCV（图表专用） |
| `market:heartbeat` | 服务存活 + 各 pool 最后事件时间 |

MVP **至少实现** `market:tick:{pair}`；其余可在监控需求明确后追加。

### 5.3 不再由 DE 发布

- ~~`MarketDataProducer` 在 DE 内 `publish`~~ → 已迁至 **market-monitor**。

---

## 6. Decision Engine 侧：`MarketDataConsumer`

```python
# 概念伪代码（实现落在 backend/app/market/consumer.py）
class MarketDataConsumer:
    async def start(self):
        pubsub = redis.pubsub()
        await pubsub.psubscribe("market:tick:*")
        async for msg in pubsub.listen():
            event = MarketEvent.from_json(msg["data"])
            await self.actor_manager.broadcast_market_tick(event)
```

- **不**再调用 Sui RPC。  
- DE 重启期间：丢失 Pub/Sub 消息；Actor 应用 REST/缓存最后一拍，并打 `stale` 日志（见调研降级策略）。

---

## 7. 与 `simulation.tick` 的关系

| 步骤 | 负责方 |
|------|--------|
| DeepBook → OHLCV + 指标 | **market-monitor** |
| Redis `market:tick:{pair}` | **market-monitor** |
| 八步决策 + 更新模拟状态 | **PandaActor（DE）** |
| WSS `simulation.tick`（candle + panda_state） | **DE 或 Hub** 在 Actor 处理后组装 |

前端 K 线**不应**要求 DE 内嵌监听；可订阅 Hub 转发的 `simulation.tick`，或 Hub 额外订阅 `market:candles:1m:{pair}`。

---

## 8. 部署与环境变量

| 变量 | 说明 |
|------|------|
| `REDIS_URL` | `rediss://…`（Upstash，与 DE 相同逻辑库） |
| `SUI_NETWORK` | `testnet` / `mainnet` |
| `SUI_RPC_URL` | 默认 `https://fullnode.testnet.sui.io:443` |
| `DEEPBOOK_PACKAGE_ID` | 默认 `0xdee9` |
| `DEEPBOOK_POOL_IDS` | JSON 或逗号分隔 Pool 对象 ID |
| `POLL_INTERVAL_SEC` | 事件轮询间隔，建议 ≥ 2（公共 RPC 限流） |
| `KLINE_INTERVAL_SEC` | K 线周期，默认 `60` |
| `PORT` | Render 注入，`/health` |

**Render**：`render.yaml` 中 **`trading-panda-market-monitor`** 与 **`trading-panda-backend`** 并列；共享 `REDIS_URL`，**不**共享进程。

---

## 9. 健康检查与降级

- `GET /health` → `{ "status": "ok", "pools": { "SUI-USDC": { "last_event_ts": … } } }`
- RPC 连续失败 → 指数退避 + 可选 `market:heartbeat` 发 `degraded` / `down`
- 无新成交 → 沿用上一根 K 线，payload 带 `"stale": true`（DE 可打日志，不阻断 HOLD）

---

## 10. 明确不做（MVP）

| 排除项 | 原因 |
|--------|------|
| 自托管 DeepBook Indexer（PostgreSQL） | MVP 只需实时 K 线，内存维护即可 |
| DE 内嵌 Sui 轮询 | 已选方案 B |
| 链上 PlaceOrder / Swap 实盘 | PRD：MVP 仅模拟 |
| DeepBook 官方 server crate 公有 URL | 无公共端点，MVP 用 RPC |

---

## 11. 相关文档

| 文档 | 内容 |
|------|------|
| `docs/redis-architecture.md` | Upstash、频道总表 |
| `docs/agent-design.md` | `MarketEvent` 字段、八步管线输入 |
| `docs/backend-design.md` | DE 消费方、DeepBook 集成层（v3） |
| `docs/business-flow.md` | 模拟循环 |
| `dev-docs/DEV_CONTEXT.md` | 部署事实与变更日志 |

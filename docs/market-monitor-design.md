# Market Monitor — 独立市场监听服务（方案 B）

> **架构决策（已锁定 · 方案甲）**：DeepBook 行情采集、**K 线聚合**、技术指标计算在独立进程 `market-monitor/`。  
> **OHLCV 主源**：DeepBook PostgreSQL **`order_fills`**（Indexer 写入；**不**依赖 `/ohclv` / `ohclv_*`，因 Indexer 无 K 线处理器）。  
> **盘口**：仍经 **DeepBook Server HTTP** `GET /orderbook/{pool}`（:9008）。  
> **池列表**：默认 **`suix_queryEvents`** + 可选 `GET /get_pools`；`DEEPBOOK_POOLS` 可强制覆盖。  
> **下游**：`PUBLISH market:tick:{pair}` → **Decision Engine** + **WebSocket Hub**（前端 K 线与 DE **同源**）。  
> **部署建议**：与 DeepBook PG **同 VPS**（如 `152.53.166.128:5433`），避免 Render 跨公网扒库。  
> **最后更新**：2026-05-20（方案甲：monitor 聚 K 线 + Hub 转发）

---

## 1. 为什么独立（方案 B）

| 耦合在 DE 内（方案 A） | 独立 `market-monitor`（方案 B，当前） |
|------------------------|-------------------------------------|
| DE 重启 = 行情断流 | 监听可单独重启，DE 仍可用缓存/最后一拍 |
| DeepBook API 抖动拖慢 Actor | 行情 I/O 与决策计算分进程隔离 |
| 无法按交易对单独扩容 | 可按 Pool 分 Task / 多实例 shard |
| 测试决策要起整套 DeepBook 采集 | DE 测试可 mock Redis 消息 |

调研原文（Obsidian，不随 Git 版本管理）：  
`…/research/deepbook-integration-research.md`

---

## 2. 服务拓扑

```
Sui Fullnode（JSON-RPC，只读）
    │  suix_queryEvents → PoolCreated → BASE_QUOTE
    ▼
DeepBook Indexer ──► PostgreSQL order_fills (:5433，VPS)
    │                      ▲
    │                      │ 增量读 + 内存聚 OHLCV（1m 等）
    │                      │
market-monitor ────────────┘     HTTP :9008 ──► /orderbook（盘口）
    │
    ├── PUBLISH market:tick:{pair} ──► Upstash Redis
    │         ├──► Decision Engine（SUBSCRIBE，八步决策）
    │         └──► WebSocket Hub（SUBSCRIBE，转发前端 K 线/行情，方案甲）
    │
    └── GET /candles/{pool}（规划）──► 前端 REST 历史 K 线（Pub/Sub 不承载历史）
```

**Decision Engine** 仅 **订阅 Redis** `market:tick:*`，不再内嵌行情轮询。

**WebSocket Hub** **不**直连本服务 HTTP；经 **Upstash** 订 `market:tick:*` + `panda:*`（见 `docs/websocket-hub-design.md` §3.4）。**MVP 不需要**独立 K-line WSS（`:9009` 为可选方案，见 `docs/kline-websocket-service.md` §「方案乙」）。

---

## 3. 仓库目录（规划）

```
market-monitor/
├── main.py              # 启动轮询 + /health + /candles（规划）
├── config.py            # DEEPBOOK_PG_URL, DEEPBOOK_SERVER_URL, REDIS_URL, …
├── feed/
│   ├── deepbook_client.py  # httpx → orderbook（:9008）
│   ├── fills_client.py     # asyncpg → order_fills 增量（方案甲，待实现）
│   ├── sui_pool_client.py  # suix_queryEvents → 池名
│   └── orderbook.py
├── pipeline/
│   ├── kline_aggregate.py  # order_fills → OHLCV（方案甲，待实现）
│   ├── indicators.py
│   └── market_state.py
├── broadcast/
│   ├── publisher.py
│   └── schemas.py
└── tests/
```

实现状态：**方案甲已实现**（`fills_client` + `kline_aggregate` + `GET /candles/{pool}`）；设 `DEEPBOOK_DATABASE_URL` 启用 PG；`USE_OHLCV_FALLBACK=true` 可回退 HTTP `/ohclv`。

---

## 4. DeepBook 数据接入（MVP）

### 4.1 基础设施

本地/联调按 **`docs/deepbook-v3-server-local-deployment.md`** 启动：

1. PostgreSQL  
2. **deepbook-indexer**（建议保留约 1 个月数据）  
3. **deepbook-server**（默认 `http://localhost:9008`）

### 4.2 池列表（Sui RPC，默认）

| 步骤 | 说明 |
|------|------|
| 1 | `suix_queryEvents`，`query` = `{ "MoveModule": { "package": DEEPBOOK_PACKAGE_ID, "module": DEEPBOOK_POOL_MODULE } }`（默认 `pool`） |
| 2 | 遍历 `events[].type`，匹配 `::pool::PoolCreated<…>`（大小写不敏感路径段） |
| 3 | 从泛型参数解析 `Base`、`Quote`，映射为符号并拼成 `BASE_QUOTE`（如 `SUI_USDC`），与 DeepBook Server URL 路径一致 |
| 4 | 分页：`cursor` + `limit`，直到无下一页或达 `POOL_RPC_MAX_PAGES` |

**优先级**：`DEEPBOOK_POOLS`（逗号分隔）**最高**；留空则走 Sui；若 Sui 无结果且 `USE_HTTP_GET_POOLS_FALLBACK=true`，再合并 `GET /get_pools`。

关闭 Sui 池发现（不推荐）：`USE_SUI_RPC_FOR_POOLS=false` 且开启 HTTP 回退，则行为退化为仅从 `/get_pools` 取池。

### 4.3 数据接入（方案甲）

| 用途 | 来源 | 说明 |
|------|------|------|
| **K 线 OHLCV** | **PostgreSQL `order_fills`** | Indexer 落库；本服务增量轮询 + 内存聚合（`last_id` 或时间游标） |
| 实时订单簿 | `GET /orderbook/{pool}`（:9008） | `orderbook_imbalance` |
| 成交（可选校对） | `GET /trades/{pool}` 或 PG | MVP 以 `order_fills` 为准 |
| 池列表（回退） | `GET /get_pools` | Sui 发现失败时 |
| ~~K 线~~ | ~~`GET /ohclv`~~ | **不采用** — DeepBook Indexer 无 K 线处理器，`ohclv_*` 常为空 |

**环境变量（新增）**：`DEEPBOOK_DATABASE_URL`（或 `DEEPBOOK_PG_URL`）指向 VPS PG，如 `postgresql://…@127.0.0.1:5433/deepbook`。

**PG 回溯（与轮询频率分离）**：

| 变量 | 默认 | 用途 |
|------|------|------|
| `POLL_INTERVAL_SEC` | `15` | 主循环多久扫一轮（盘口 + 尝试发 tick） |
| `FILLS_POLL_LOOKBACK_SEC` | `259200`（72h） | 每轮 tick 从 `order_fills` 读多久以前的数据 |
| `FILLS_LOOKBACK_SEC` | `2592000`（30d） | `GET /candles/{pool}` 历史图（对齐 Indexer ~30d 保留） |

Testnet 成交稀疏时：**拉长 `FILLS_POLL_*` 比缩短 `POLL_INTERVAL_SEC` 更重要**；MVP 建议 `DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC`。

**明确不做**：用 Sui RPC 自算链上 OHLCV；`SUI_RPC_URL` **仅** §4.2 池枚举。

**模拟盘**：仍只读行情，不在链上下真实单（与 PRD C5 一致）。

---

## 5. Redis 频道与消息契约

与 `docs/redis-architecture.md` 对齐；**发布方改为 Market Monitor**。

### 5.1 主频道（Decision Engine 必订）

| Channel | 频率 | 订阅方 | 说明 |
|---------|------|--------|------|
| `market:tick:{pair}` | 新 K 线或 `stale` 节拍（`POLL_INTERVAL_SEC`） | **DE**（必须）、**WS Hub**（必须，前端 K 线） | **完整 `MarketEvent`**（含 `candle` + 指标） |

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

> `candle` **应**嵌入同一消息：Hub 转发为 WS `market.tick`（或 api-spec 约定名）供前端 `lightweight-charts` 更新最后一根；与 DE 决策 **同一拍**，避免图表与大脑价格不一致。

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

## 7. 与前端 K 线、`simulation.tick` 的关系（方案甲）

| 步骤 | 负责方 |
|------|--------|
| `order_fills` → 聚 K 线 + 指标 | **market-monitor** |
| Redis `market:tick:{pair}` | **market-monitor** PUBLISH |
| 八步决策 | **DE** SUBSCRIBE `market:tick:*` |
| **前端 K 线（实时）** | **Hub** SUBSCRIBE `market:tick:*` → WSS 转发（`subscribe.market`） |
| **前端 K 线（历史）** | **REST** `GET /candles/{pool}`（monitor 或 Next BFF 代理） |
| 熊猫状态 / 成交 / 情绪 | **DE** PUBLISH `panda:*` → Hub → `subscribe.simulation` |

```text
打开 Dashboard：
  REST 拉 100 根 K 线 → 画满图
  WSS Hub subscribe.market → 后续 market:tick 更新最后一根
  WSS Hub subscribe.simulation → 熊猫事件
```

**独立 K-line WSS (:9009)**：仅在高频逐笔推 bar、或要减轻 Hub Redis 流量时再拆（方案乙，见 `docs/kline-websocket-service.md`）。

---

## 8. 部署与环境变量

| 变量 | 说明 |
|------|------|
| `REDIS_URL` | `rediss://…`（Upstash，与 DE 相同逻辑库） |
| `DEEPBOOK_DATABASE_URL` | DeepBook **Indexer 库**（含 `order_fills`）；VPS 建议 `127.0.0.1:5433` |
| `DEEPBOOK_SERVER_URL` | DeepBook Server 基址（盘口，如 `http://localhost:9008`） |
| `DEEPBOOK_POOLS` | 可选；**非空则强制使用**，逗号分隔；留空则 Sui RPC 发现 + 可选 HTTP 回退 |
| `SUI_RPC_URL` | 全节点 JSON-RPC；默认 Testnet fullnode；主网须与 `DEEPBOOK_PACKAGE_ID` 一致 |
| `DEEPBOOK_PACKAGE_ID` | DeepBook Move 包 ID（默认 `0xdee9`，须与网络一致） |
| `DEEPBOOK_POOL_MODULE` | 含 `PoolCreated` 的模块名，默认 `pool` |
| `USE_SUI_RPC_FOR_POOLS` | 默认 `true`；`false` 时跳过 Sui 池发现（须配合 HTTP 回退或 `DEEPBOOK_POOLS`） |
| `USE_HTTP_GET_POOLS_FALLBACK` | Sui 无结果时是否再调 `GET /get_pools`，默认 `true` |
| `POOL_RPC_LIMIT_PER_PAGE` / `POOL_RPC_MAX_PAGES` | `suix_queryEvents` 分页 |
| `POLL_INTERVAL_SEC` | 主循环间隔，默认 **15**（testnet 可 15–30） |
| `FILLS_POLL_LOOKBACK_SEC` | tick 读 PG 深度，默认 **72h** |
| `FILLS_LOOKBACK_SEC` | REST `/candles` 深度，默认 **30d** |
| `PORT` | Render 注入，`/health` |

**部署**：方案甲推荐 **VPS 与 DeepBook PG 同机**（systemd）；若暂放 Render，须能访问 VPS PG（防火墙 + TLS）。`render.yaml` 中 `trading-panda-market-monitor` 与 backend 共享 `REDIS_URL`。

---

## 9. 健康检查与降级

- `GET /health` → `status`、`fills_poll_lookback_sec`、`pools` 各池 `last_event_ts` / `error`（`no_fills_ever`、`no_fills_in_poll_window`、`insufficient_candles`、`pool_unresolved` 等）
- DeepBook Server 不可达 → 指数退避；若池列表已由 Sui 解析成功，整体可为 **`degraded`**（池发现正常、行情停更）
- Sui 池发现失败且未配置 `DEEPBOOK_POOLS`、HTTP 回退也失败 → `pool_discovery_error` 非空，无可用池时行情轮询跳过
- 无新成交 → 沿用上一根 K 线，payload 带 `"stale": true`（DE 可打日志，不阻断 HOLD）

---

## 10. 明确不做（MVP）

| 排除项 | 原因 |
|--------|------|
| 依赖 `GET /ohclv` 作为 MVP 主路径 | Indexer 无 K 线处理器；改用 **PG `order_fills`** |
| 在 Worker 内查 DeepBook PG | CF 无法直连；由本服务聚好后 **PUBLISH Redis** |
| 在 TradingPanda 仓库内嵌 DeepBook Indexer / Server 源码 | 以外部部署文档为准，本仓只消费 HTTP + 可选自建 |
| DE 内嵌 Sui 或 DeepBook 行情轮询 | 已选方案 B，由本服务发布 Redis |
| 链上 PlaceOrder / Swap 实盘 | PRD：MVP 仅模拟 |
| 依赖「官方公共」DeepBook Server 托管 URL | 无保证的公共端点；须自备或第三方托管 Server |

---

## 11. 相关文档

| 文档 | 内容 |
|------|------|
| `docs/redis-architecture.md` | Upstash、频道总表 |
| `docs/agent-design.md` | `MarketEvent` 字段、八步管线输入 |
| `docs/backend-design.md` | DE 消费方、DeepBook 集成层（v3） |
| `docs/business-flow.md` | 模拟循环 |
| `docs/kline-websocket-service.md` | **方案乙**（可选独立 K 线 WSS） |
| `docs/websocket-hub-design.md` | Hub 订 `market:tick` + `panda:*` |
| `dev-docs/DEV_CONTEXT.md` | 部署事实与变更日志 |

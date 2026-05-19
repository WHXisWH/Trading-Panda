# Redis 架构与部署（推荐方案）

> 汇总仓库内工程约束与 **2026-05-15** 调研结论（Obsidian：`research/redis-architecture-research.md`）。  
> **最后更新**：2026-05-19（无 `redis-pubsub` 服务；DE / Hub 直连 Upstash）

---

## 1. 执行摘要

| 维度 | 结论 |
|------|------|
| Redis 是否独立 | **是** — 独立基础设施，不嵌入 DE、不嵌入 CF Worker |
| 能否在 Cloudflare Workers 内跑原生 Redis | **否** — Workers 无持久 TCP listen、无 OS 级进程、128MB 隔离、无状态模型，与 Redis 服务器模型根本冲突 |
| 是否需要独立 `redis-pubsub/` 服务 | **否** — Upstash TS SDK 原生支持 SUBSCRIBE（HTTP 长轮询），DE 直连 TCP，无需中间桥 |
| **MVP 推荐托管** | **Upstash Redis（Valkey 兼容）** — Serverless、REST + TCP 双端、与 CF/Python 均兼容 |
| 推荐消息流 | **market-monitor → Redis → DE / Hub**；**DE → Redis `panda:*` → Hub → WSS**；**Hub 直连 Upstash REST** |
| MVP 增量成本（Redis 本身） | **$0/月**（Upstash 免费层约 10k cmd/天，配额以官网为准） |

---

## 2. Redis 在 TradingPanda 中的职责（六类）

| # | 用途 | 典型数据结构 | 说明 |
|---|------|----------------|------|
| 1 | **Pub/Sub 总线** | Channel 消息 | DE 发 `panda:*` → Hub → 前端；**最不可替代** |
| 2 | **市场数据广播** | Channel | `market:tick:{pair}`；**market-monitor** 发布，DE / Hub 订阅 |
| 3 | **响应缓存** | String + TTL | 熊猫快照、排行榜、市场列表 |
| 4 | **Nonce / 短时认证态** | String + TTL（如 5min） | 登录 challenge 等 |
| 5 | **策略解析缓存** | String + TTL（如 24h） | 解析后 JSON |
| 6 | **限流计数** | INCR + TTL | HTTP / WSS 侧计数 |

用途 1–2 对 Redis 依赖最深；3–6 理论上可迁到别处，但会增复杂度 — **MVP 采用方案 A：同一 Upstash 实例承担六类**（见调研 §二）。

**简化结论（2026-05-19）**：DE（Render）和 CF Hub（Workers）均**直连 Upstash**，无需中间桥接服务。Upstash TS SDK 的 `subscribe()` 通过 HTTP 长轮询实现，延迟约 100-200ms，对 TradingPanda 决策频率完全够用。

Hub **不**直连 `market-monitor`（行情只 `PUBLISH` 进 Upstash）。见 `docs/websocket-hub-design.md` §3.4。

### 2.1 直连架构（替代原 redis-pubsub 方案）

```
market-monitor ──PUBLISH──► Upstash ◄──SUBSCRIBE── DE (Render, redis.asyncio TCP)
                                    │
                                    │ @upstash/redis (REST 长轮询)
                                    ▼
                           CF Hub (Workers)
                                    │ ws.send()
                                    ▼
                           前端 (浏览器 WebSocket)
```

| 端 | 连接方式 | 说明 |
|----|----------|------|
| **DE（Render）** | `redis.asyncio` + `rediss://` TCP | SUBSCRIBE `market:tick:*`、PUBLISH `panda:*`；低延迟，1-5ms |
| **CF Hub（Workers）** | `@upstash/redis` REST | SUBSCRIBE `panda:*`；HTTP 长轮询，延迟 100-200ms，对非高频场景够用 |
| **market-monitor（Render）** | `redis.asyncio` + `rediss://` TCP | PUBLISH `market:tick:*` |

---

## 3. 架构决策：独立服务（方案 A）

> **2026-05-19 修正**：不再需要独立 `redis-pubsub/` 服务。DE 和 Hub 均直连 Upstash。

- **Python（Render）**：`redis.asyncio`，**TLS TCP** `rediss://…`（`REDIS_URL`）。DE 和 market-monitor 均直连。
- **Cloudflare Worker**：`@upstash/redis`（**REST**），环境变量 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`；**不得**在 Worker 内自建 Redis 进程。
- **Pub/Sub 在 Worker 侧**：`@upstash/redis` SDK 的 `subscribe()` 方法（REST 长轮询），收到消息后路由到 **UserHub DO**，再 `ws.send()`。

---

## 4. 推荐消息流（MVP）

```
DeepBook v3 ──Sui RPC──► market-monitor/ (Render)
                             │ PUBLISH market:tick:*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Decision Engine (Render · Python / FastAPI)                     │
│  MarketDataConsumer ──SUBSCRIBE──► broadcast_market_tick()       │
│  PandaActor (8-step) ──► PUBLISH panda:{id}:*                    │
│  Scheduler: Walrus / Merkle → Redis (walrus:*)                   │
│  连接方式：redis.asyncio + rediss:// 直连 Upstash               │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Upstash Redis (Serverless · Valkey 内核)                        │
│                                                                 │
│  Redis 角色：                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Pub/Sub 总线 │  │ 缓存 (TTL)   │  │ Nonce / 限流 / 其他   │  │
│  │ - panda:*   │  │ - 熊猫状态   │  │ - JWT nonce (5min)   │  │
│  │ - market:*  │  │ - 排行榜(5m) │  │ - Rate limit counter │  │
│  │ - walrus:*  │  │ - 策略(24h)  │  │ - Auth sessions      │  │
│  └──────┬──────┘  └──────────────┘  └───────────────────────┘  │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ SUBSCRIBE (@upstash/redis REST 长轮询)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (WebSocket Hub)                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ @upstash/redis SDK subscribe()                           │   │
│  │ 收到消息 → 解析事件类型 → 查找目标 DO → ws.send()         │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │ Durable Objects (WS 连接管理)                             │   │
│  │ - 每个 DO 管理 500-800 WS 连接                             │   │
│  │ - Hibernation API 闲置零成本                               │   │
│  │ - 心跳/重连/背压/房间路由                                  │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│                   WebSocket 推送                                  │
└─────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
                   前端 (浏览器 · WebSocket)
```

**延迟对比**：

| 链路 | 延迟 | 说明 |
|------|------|------|
| market-monitor → DE | ~1-5ms | TCP 直连 Upstash，同 region |
| DE PUBLISH → Hub 收到 | ~100-200ms | REST 长轮询，TradingPanda 决策频率（秒级）完全够用 |
| Hub → 前端 | ~50-100ms | WebSocket 推送 |

---

## 5. Pub/Sub 频道命名（推荐契约）

**约定**：`{id}` / `{pair}` 为 URL-safe 标识（UUID 或 `SUI-USDC` 等）。

| Redis channel | 发布方 | 订阅方 | 用途 |
|---------------|--------|--------|------|
| `panda:{id}:decision` | PandaActor / Broadcaster | WS Hub、（可选）调试工具 | 交易决策（BUY/SELL/HOLD 等） |
| `panda:{id}:emotion` | 情绪状态机 | WS Hub | 情绪迁移 |
| `panda:{id}:experience` | 经验引擎 | WS Hub | 经验变更 |
| `panda:{id}:diary` | Agent / 日记任务 | WS Hub | 日记生成 |
| `market:tick:{pair}` | **market-monitor**（独立服务） | PandaActor（经 DE `MarketDataConsumer`）、可选 WS Hub | 完整 `MarketEvent`（含 OHLCV + 指标）；`pair` 如 `SUI-USDC` |
| `market:fill:{pair}` | market-monitor（可选） | 调试 / 高频图表 | 单笔成交归一化 |
| `market:candles:1m:{pair}` | market-monitor（可选） | WS Hub | 仅 K 线 OHLCV |
| `market:heartbeat` | market-monitor | 运维 / DE 降级判断 | 存活与各 pool 最后事件时间 |
| `walrus:synced` | Walrus 同步 Worker | WS Hub | 备份/链上同步通知 |

**与 WebSocket 事件名的关系**：Redis payload 仍遵循 `docs/api-specification.md` §4.3 的 `event` + `payload` 外壳；**频道名**与 **WS `event` 字符串**不必相同，但 Hub 转发时应保持 body 契约一致。

**迁移说明**：历史文档若出现 `panda:{id}`（无后缀）、`market:{asset}`，实现时应统一到上表，或短期双发双订直至客户端与 DE 全量切换。

---

## 6. 可靠性与容错（摘要）

| 场景 | 行为 | 缓解 |
|------|------|------|
| Pub/Sub 无持久化 | 离线期间消息丢失 | 重连后 **REST 拉最新状态**；关键事实以 Postgres 为准 |
| Worker / DO 重启 | WSS 断开 | 客户端指数退避重连 |
| Upstash 短时不可用 | 投递失败 | DE 侧有界内存队列 + 重试（实现阶段补充） |
| REST 长轮询延迟 | Hub 收到消息有 100-200ms 间隔 | 对 TradingPanda 秒级决策无影响；若未来需更低延迟，可升级 Upstash 付费层或引入 WebSocket Connector |

---

## 7. 成本与迁移路径（摘要）

- **MVP**：Upstash Free + CF Workers Free 档 → Redis 增量常为 **$0**（以官方定价为准）。
- **增长**：Upstash Pay-as-you-go（约 $3–15/月量级，视 cmd 量）。
- **规模化**：Upstash Global / 自建 Valkey（当月费明显高于托管时再评估）。

**不要做**：在 Worker 里跑原生 Redis；用 Queues 传实时 tick；用 Vercel KV 替代 Pub/Sub（KV 无原生 SUBSCRIBE）。

---

## 8. 实现清单（P0 / P1）

| 优先级 | 事项 |
|--------|------|
| P0 | ~~创建 Upstash 数据库~~ ✅ 已完成（2026-05-19）；Render 配置 `REDIS_URL`（`rediss://`） |
| P0 | Worker 项目配置 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` |
| P0 | market-monitor：`PUBLISH` `market:tick:*`；DE：`SUBSCRIBE` 市场频道 + `PUBLISH` `panda:*`（直连 Upstash，无需中间服务） |
| P0 | ~~部署 `redis-pubsub`~~ **已取消** — DE 和 Hub 直连 Upstash，不需要独立桥接服务 |
| P0 | CF Hub：`@upstash/redis` SDK `subscribe()` 直接订阅 `panda:*` |
| P1 | 验证 Upstash REST 长轮询 SUBSCRIBE 在 Workers 环境下的实际延迟 |

---

## 9. 变更记录

| 日期 | 变更 | 原因 |
|------|------|------|
| 2026-05-19 | 去掉独立 `redis-pubsub/` 服务，DE 和 Hub 直连 Upstash | Upstash TS SDK 原生支持 SUBSCRIBE，无需中间桥；简化架构降低运维成本 |

---

## 10. 仓库外原文路径

个人调研笔记（不随 Git 版本管理）：  
`/Users/Murphywuwu/Documents/Obsidian Vault/Artifact-Registry/sui-ai-trading-pet/research/redis-architecture-research.md`

**契约优先级**：以 **本文 + `docs/market-monitor-design.md` + `docs/websocket-hub-design.md` + `docs/api-specification.md`** 为准；Obsidian 为来源补充。

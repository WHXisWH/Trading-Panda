# WebSocket Hub — Cloudflare Workers + Durable Objects

> 将「实时推送层」从 Vercel（无长连接）迁出，由 **Cloudflare Workers + Durable Objects（DO）** 承载；与既有 **Python Decision Engine（Render）+ Redis Pub/Sub** 对齐。  
> **最后更新**：2026-06-17（PRD v3.1：Hub 转发 Training Ledger、Chain Proof、Review、Skill Memory 事件）

---

## 1. 目标

| 目标 | 说明 |
|------|------|
| 长连接 | WebSocket 升级与保持由 Edge 完成，不依赖 Vercel Serverless |
| 与 DE 解耦 | 决策/情绪等事件仍由 Python 发布到 Redis；Hub 只消费与转发 |
| 成本与休眠 | 利用 WebSocket **Hibernation**，无消息时降低 CPU 计费 |
| 水平扩展 | DO **按用户** 路由（见 §3.3）；用户量大时用 `hash(user_id) % N` 分片，**不按 panda_id 建 DO** |

### 1.1 非目标（已锁定）

| 排除项 | 负责方 |
|--------|--------|
| 查询 PostgreSQL、`order_fills` 聚合 | **market-monitor**（VPS + PG）→ `PUBLISH market:tick:*` |
| 在 Worker/DO 内维护 K 线 bar 状态 | **不采用** |
| HTTP/WebSocket **直连** market-monitor 进程 | **不采用** — 只经 **Upstash** 与 DE 同级消费 |

**方案甲（MVP）**：前端 **单 WebSocket** `NEXT_PUBLIC_WS_URL`（本 Hub）+ **REST** 历史 K 线；Hub 订 **`market:tick:*` + `panda:*`**。独立 K-line `:9009` 为方案乙（可选）。

---

## 2. 拓扑（逻辑）

```
浏览器 ──HTTPS──► Vercel（REST：历史 K 线、JWT；可代理 monitor GET /candles）
浏览器 ──WSS────► Cloudflare Worker → UserHub DO（user:{user_id}）
                    │
                    │  Upstash SUBSCRIBE：
                    │    market:tick:*  → 转发 K 线/行情（subscribe.market）
                    │    panda:*        → 转发熊猫事件（subscribe.simulation / agent training）
                    ▼
              单连接最多 3 条 socket

market-monitor（VPS，读 PG order_fills）──PUBLISH market:tick:*──┐
Decision Engine ──SUBSCRIBE market:tick / PUBLISH panda:*────┤──► Upstash
```

**原则**：PostgreSQL 与链上仍为权威数据；**Upstash Redis** 为消息总线 + 缓存（见 `docs/redis-architecture.md`）；DO 仅存连接与推送相关的**短时、小体量**状态（见下文）。

---

## 3. 组件职责

### 3.1 Router Worker

- 校验 JWT（与 Next 签发算法一致；密钥通过 Worker Secret / 或短时 introspection）
- 连接级限流（例如每连接 10 msg/s）
- `fetch` 中完成 WebSocket 升级，将 socket 交给对应 DO

### 3.2 Durable Object（连接与转发）

- 维护**一个用户**在本分片内的 **WebSocket 句柄**（最多 3 条连接，见 `backend-design`）
- 维护该用户的 **Redis 频道订阅表**（键为 `panda_id`，值为 channel 名列表）
- 使用 **alarms** 做心跳检测与清理僵死连接
- 通过 **Upstash** 订阅 **`market:tick:*` + `panda:{id}:*`**，按用户订阅表转发（频道见 `docs/redis-architecture.md` §5）
- 可选：**小队列**（有界）在客户端背压时暂存；满则按策略丢弃最旧（与 `backend-design` 背压一致）

### 3.3 DO 实例命名与路由（实现必须遵守）

**规则：一个 DO 实例对应一个用户，不要用 `panda_id` 作为 DO 的 id。**

| 维度 | WebSocket Hub（CF DO） | Decision Engine（Render） |
|------|------------------------|---------------------------|
| 分片键 | `user_id`（JWT `sub` / 内部 `users.id`） | `panda_id`（`PandaActor` 一熊猫一协程） |
| 原因 | 连接主体是浏览器与用户；订阅可多只熊猫 | 交易与八步决策按熊猫隔离 |

#### MVP：一用户一 DO

Router Worker 在 JWT 校验通过后，从 payload 取出 `user_id`，用固定前缀生成 DO stub：

```typescript
// Router Worker（伪代码）
const userId = jwt.sub; // 或你们 JWT 里的 users.id UUID

const id = env.USER_HUB.idFromName(`user:${userId}`);
const stub = env.USER_HUB.get(id);

return stub.fetch(request); // 在该 DO 内完成 WebSocket 升级
```

- **DO 类名（示例）**：`UserHub` / `WebSocketHub`（实现时自定，文档统称 UserHub）
- **实例名（写死）**：`user:{user_id}` — 例如 `user:usr_8f3a2c1b` 或 `user:660e8400-e29b-41d4-a716-446655440001`
- **禁止**：`idFromName(\`panda:${pandaId}\`)` — 会把「推送接线」和「交易大脑」混在同一维度，且无法表达「一个用户盯多只熊猫」

#### 扩展：用户量增大时的分片

当单 DO 内存或连接数接近上限时，仍**以 user_id 哈希**，不要改用 panda_id：

```typescript
const SHARD_COUNT = 32; // 配置项，按流量调整
const shard = hash(userId) % SHARD_COUNT;
const id = env.USER_HUB.idFromName(`shard:${shard}:user:${userId}`);
```

每个 shard DO 内仍只服务**落在该分片上的那些用户**；逻辑与 MVP 相同。

#### 用户连上后如何收到某只熊猫的事件

DO 不负责决策，只负责**订阅关系**：

1. 客户端 WSS 连接成功后，发送 subscribe（消息格式以 `api-specification.md` 为准），例如关注 `panda_id = pnd_7a9f3e2d`。
2. DO 在内存（或 DO storage）记录：`user U → subscriptions: [ "panda:pnd_7a9f3e2d:decision", "panda:pnd_7a9f3e2d:emotion", … ]`（完整列表见 `docs/redis-architecture.md` §5）。
3. Python `PandaActor` 成交或情绪变化后 **PUBLISH** 到上述 channel；Hub 收到后查表，只推给订阅了该 `panda_id` 的 socket。

```
Render:  PandaActor(pnd_A) ──PUBLISH──► Redis channel panda:pnd_A:decision
CF:      DO(user:U) 已订阅该频道 ──WSS──► 用户 U 的浏览器
```

**与 Postgres 的分工**：完整 OrderIntent、Trade Fact、policy snapshot、review、chain execution log 写入 PostgreSQL；WSS 只推摘要事件（decision、order intent、execution/proof status、review、skill），**不**承载权威业务状态。

### 3.4 行情数据：经 Upstash 订阅，禁止直连 market-monitor

**决策（MVP 锁定）**：WebSocket Hub **不**通过 HTTP/WebSocket 直连 Render 上的 `market-monitor/`；与 Decision Engine 一样，作为 **Upstash Redis 的订阅方** 消费行情。

#### 推荐数据流

```
DeepBook v3
    ▼
market-monitor/  ──PUBLISH market:tick:{pair}──►  Upstash Redis
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        ▼                             ▼                             ▼
                 Decision Engine              WebSocket Hub (CF)
                 SUBSCRIBE market:tick（必须） SUBSCRIBE market:tick（必须）
                 SUBSCRIBE → PandaActor         → WSS 推浏览器 K 线/行情
                 PUBLISH panda:*  ──────────► SUBSCRIBE panda:* → WSS 推熊猫事件
```

Hub 与 DE **同级**消费 `market:tick`；**同一包** `MarketEvent` 保证图表与决策价格一致。

#### Hub 应订哪些频道（方案甲 · MVP）

| 频道 | 是否必须 | 用途 |
|------|----------|------|
| `market:tick:{pair}` | **必须** | K 线实时更新（`MarketEvent.candle` + 价格）；`subscribe.market` 后转发 |
| `panda:{id}:decision` / `order_intent` / `execution` / `review` / `skill` / `emotion` / `experience` / `diary` | **必须** | 熊猫实时事件（DE / workers 发布） |
| `market:candles:*` | 不订 | 与 `market:tick` 重复；除非未来拆瘦 payload |
| `simulation.tick` | 兼容 | 旧模拟盘摘要；新实现优先使用 `panda:{id}:*` 事件 |

Chain Proof Panel depends on:

| Redis channel | WS event intent |
|---|---|
| `panda:{id}:order_intent` | Show policy result and proof eligibility |
| `panda:{id}:execution` | Show Training Ledger execution, Mode 2 proof status, tx digest, or failure |
| `panda:{id}:review` | Show evidence-backed win/loss review |
| `panda:{id}:skill` | Show Skill Memory version changes |

前端：**仅** `NEXT_PUBLIC_WS_URL`；历史 K 线走 **REST**（见 `docs/market-monitor-design.md` §7）。

#### 为何禁止 Hub 直连 market-monitor

| 直连 monitor | 经 Upstash（采用） |
|--------------|-------------------|
| monitor 需维护 Hub 连接、鉴权、按用户过滤 | monitor 只 `PUBLISH`，无推送职责 |
| DE 与 Hub 各走一路，易双轨不一致 | 单一行情总线，DE/Hub/调试工具同源 |
| Render↔CF 跨云长连接，运维复杂 | Hub 用 Upstash REST/Connector，与订 `panda:*` 同一套 |
| monitor 重启同时打断 DE 与 Hub | 监听与决策进程已解耦（方案 B） |

#### 明确不采用的模式

- **不**在 **DE（backend）进程内**嵌 Pub/Sub 桥接 — DE 与 Hub 均**直连 Upstash**（无独立 `redis-pubsub` 服务）。
- **不**让 Hub 成为 monitor 的 WebSocket 客户端（无 `wss://market-monitor/...`）。

Hub 通过 **`@upstash/redis`** 订阅 **`panda:*` + `market:tick:*`（或 `market:*`）**，与 DE 读同一 Upstash 逻辑库；转发时 **不**改写 `MarketEvent` 语义（WS `event` 名见 api-spec）。

Upstash 短时不可用时：Hub 重连 + 客户端 REST 拉快照；权威状态仍以 **PostgreSQL** 为准。

实现细节与频道全表见 `docs/redis-architecture.md` §5、`docs/market-monitor-design.md` §2。

---

## 4. Redis 与 Python 的契约

- **托管**：推荐 **Upstash Redis（Valkey）** 单实例；详见 **`docs/redis-architecture.md`**（独立服务、双端接入、禁止 Worker 内嵌 Redis）。
- **频道**：以 **`docs/redis-architecture.md` §5** 为准（如 `panda:{id}:decision`、`market:tick:{pair}`）。
- **载荷**：Decision Engine **PUBLISH** 的 JSON 仍须可被 Hub 原样转发；**WebSocket 帧**外壳与 `event` 名以 `docs/api-specification.md` §4.3 为准，Hub **不**改写业务 payload 语义。

---

## 5. DO 存储边界（必须遵守）

| 适合放在 DO | 不适合放在 DO |
|-------------|----------------|
| 连接 id、订阅列表、最近心跳时间 | 用户画像、熊猫完整状态、交易历史 |
| 可选：短 TTL 展示用快照（从 DE HTTP 拉取） | Merkle、胜率、权威策略 JSON |
| 有界未送达队列（背压） | 主业务持久化（应在 PostgreSQL） |

---

## 6. 前端与环境变量（方案甲）

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_WS_URL` | **唯一**浏览器 WSS 基址（Hub：`subscribe.market` + `subscribe.simulation`） |
| `NEXT_PUBLIC_BACKEND_URL` 或 BFF | 代理 **`GET /candles/{pool}`** 拉历史 K 线（Pub/Sub 无历史） |

- Hub：`NEXT_PUBLIC_WS_URL` + `/ws?token=…`（与 `docs/api-specification.md` 同步）
- 收到 Redis `market:tick` → 转发 WS 事件（如 `market.tick`），payload 含 `candle`
- JWT 由 Next 签发；Hub 握手 `?token=`（与 api-spec 写死一种）
- ~~`NEXT_PUBLIC_KLINE_WS_URL`~~ — **方案乙** 可选，MVP 不用

---

## 7. 与 Vercel / Render 的关系

| 层 | 部署 | 职责 |
|----|------|------|
| HTTP API Gateway | Vercel · Next.js | REST、鉴权、转发 FastAPI、静态与 SSR |
| WebSocket Hub | Cloudflare Workers + DO | 长连接；**直连 Upstash** 订阅并推送 |
| Market Monitor | Render · FastAPI | DeepBook v3 行情、**PUBLISH** `market:tick:*` |
| Decision Engine | Render · FastAPI | 决策、Actor；**直连 Upstash** `SUBSCRIBE` 行情 + `PUBLISH` `panda:*` |
| Upstash Redis | 托管（非 Render） | Pub/Sub 总线 + 缓存 |

---

## 8. 扩展阅读（仓库外原文）

| 主题 | Obsidian 路径（不随 Git 版本管理） |
|------|-----------------------------------|
| WebSocket Hub / CF | `…/research/websocket-cloudflare-feasibility.md` |
| Redis 部署与消息流 | `…/research/redis-architecture-research.md` |
| DeepBook 独立监听（方案 B） | `…/research/deepbook-integration-research.md` |

**仓库内契约**：`docs/redis-architecture.md`（Redis）+ 本文（Hub/DO）+ `docs/api-specification.md`（WS 事件）。

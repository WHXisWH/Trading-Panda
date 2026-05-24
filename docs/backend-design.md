# TradingPanda 后端设计文档

> 版本 1.4 · 2026-05-20
> 基于：product-design.md / technical-feasibility-study.md / cost-model.md
> 架构：**Next.js Gateway（Vercel）** + **WebSocket Hub（CF）** + **Market Monitor（Render，DeepBook v3）** + **Decision Engine（Render）**

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户层                                         │
│    Web App (Next.js 14)  │  Telegram Bot (未来)  │  Sui Wallet (zkLogin)    │
└──────────────┬───────────────────────────────┬────────────────────────────────┘
               │ HTTPS                         │ WSS（实时）
               ▼                               ▼
┌──────────────────────────────┐   ┌────────────────────────────────────────────┐
│ HTTP API Gateway             │   │ WebSocket Hub                             │
│ Next.js 14 · Vercel         │   │ Cloudflare Workers + Durable Objects      │
│ Auth / Rate / 缓存 / REST 代理 │   │ WS 升级、订阅、Redis 消费、客户端推送     │
└──────────────┬───────────────┘   └──────────────────────┬───────────────────┘
               │                                         │
               │ HTTP REST（内部）                        │ Redis SUB（与下方
               │ 超时 5s / 重试 2 / 断路器                  │  同一 Redis 集群）
               ▼                                         │
┌────────────────────────────────────────────────────────┴────────────────────┐
│                   Decision Engine (Python · Render)                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     ActorManager                                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐        最多 100 个 Actor      │   │
│  │  │PandaActor│ │PandaActor│ │PandaActor│  ←── SUBSCRIBE market:tick:* │   │
│  │  │ #001     │ │ #002     │ │ #003     │   (由 market-monitor 发布)   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘                             │   │
│  └───────┼────────────┼────────────┼────────────────────────────────────┘   │
│          │            │            │                                         │
│  ┌───────▼────────────▼────────────▼────────────────────────────────────┐   │
│  │  8 步决策管线 (<50ms)                                                │   │
│  │  信号匹配 → 熟练度噪声 → 性格过滤 → 环境适配                          │   │
│  │  → 情绪扭曲 → 社交偏移 → 决策融合 → 风控检查                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────────┐      │
│  │ Agent      │ │ 策略解析    │ │ 情绪状态机  │ │ 经验引擎             │      │
│  │ Coordinator│ │ DeepSeek V3│ │ 7 状态     │ │ 5 子系统             │      │
│  │ (异步 3s)  │ │ (按需调用)  │ │            │ │ PostgreSQL          │      │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────────────┘      │
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────────┐      │
│  │ DeepBook   │ │ LLM 统一   │ │ Merkle     │ │ Walrus 同步         │      │
│  │ 集成层     │ │ 服务       │ │ Root Worker│ │ Worker              │      │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │               │                │
    ┌────▼────┐     ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │DeepBook │     │ DeepSeek  │   │ Sui 链上   │   │ Walrus    │
    │Testnet  │     │ V3 API    │   │ Move 合约  │   │ 去中心化  │
    │订单簿   │     │           │   │ NFT/Merkle │   │ 存储      │
    └─────────┘     └───────────┘   └───────────┘   └───────────┘

数据层:
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL (Supabase)         │  Upstash Redis（推荐）        │
│  · 用户 / 熊猫 / 交易历史       │  · Pub/Sub：DE 发布事件       │
│  · 经验数据 (5 子系统)          │  · WS Hub（CF）REST 订阅同一库 │
│  · 市场数据缓存                 │  · 响应缓存 (TTL 60s)       │
│  · Merkle Root 记录            │  · Rate Limit（HTTP 侧）     │
│                                │  · Actor 状态缓存 · Nonce 等  │
└──────────────────────────────────────────────────────────────┘
```

行情服务见 **`docs/market-monitor-design.md`**（独立进程）。WebSocket / DO 见 **`docs/websocket-hub-design.md`**（`user:{user_id}`，§3.3）。

---

## 二、API Gateway (Next.js 14 · Vercel)

### 2.1 职责

API Gateway 是面向前端的 **HTTP 业务入口**（认证、REST 代理、缓存与限流）。**WebSocket 长连接**不在此部署，由 **Cloudflare Workers + Durable Objects** 承担（见「2.3」与 `docs/websocket-hub-design.md`）。

| 职责 | 说明 |
|------|------|
| 用户认证 | JWT 签发/验证、Sui Wallet 签名验证、zkLogin 验证 |
| 请求路由 | 前端 HTTP 请求 → Decision Engine 内部转发 |
| 响应缓存 | Redis 缓存高频读取数据（熊猫状态、排行榜、市场列表） |
| Rate Limiting | HTTP：每用户 60 req/min（计数在 Redis） |
| 静态数据服务 | 成就列表、市场列表、天赋描述等缓存数据 |
| WebSocket Hub（Cloudflare） | WS 升级、房间/订阅、消费 Redis、向浏览器推送；**不属于** Vercel 进程 |

#### API 路由设计

```
/api/auth/
  POST /wallet-login       # Sui Wallet 签名登录
  POST /zklogin             # zkLogin 验证
  POST /refresh             # 刷新 JWT
  POST /logout              # 注销

/api/panda/
  GET  /list                # 用户的熊猫列表
  GET  /:id                 # 熊猫详情（性格+状态+情绪）
  GET  /:id/history         # 交易历史（分页）
  GET  /:id/experience      # 经验数据摘要
  POST /:id/strategy        # 喂策略：parsed 直传（积木）或 raw_text+LLM
  POST /:id/strategy/validate  # 校验 signal_rules，不存库
  POST /:id/start           # 开始模拟交易（→ Decision Engine）
  POST /:id/stop            # 停止模拟交易（→ Decision Engine）
  POST /:id/ask             # 向熊猫提问（→ Agent Coordinator）

/api/market/
  GET  /list                # 可交易市场列表
  GET  /:pair/kline         # K 线数据
  GET  /:pair/orderbook     # 订单簿快照

/api/leaderboard/
  GET  /                    # 排行榜（缓存 5min）

/api/achievement/
  GET  /list                # 成就列表（静态缓存）
  GET  /user/:id            # 用户成就

# WebSocket：不在 Vercel。入口为 Cloudflare Workers（URL = NEXT_PUBLIC_WS_URL），
# 路径与鉴权见 docs/api-specification.md 与 docs/websocket-hub-design.md
```

### 2.2 认证流程

#### Sui Wallet 签名验证流程

```
┌──────┐         ┌───────────┐         ┌──────────┐
│ 前端  │         │ API GW    │         │ Sui RPC  │
└──┬───┘         └─────┬─────┘         └────┬─────┘
   │  1. 请求 nonce     │                    │
   │──────────────────>│                    │
   │  2. 返回 nonce     │                    │
   │<──────────────────│                    │
   │                    │                    │
   │  3. Wallet 签名    │                    │
   │  {address, nonce,  │                    │
   │   signature}       │                    │
   │──────────────────>│                    │
   │                    │  4. 验证签名         │
   │                    │  sui_verifySignature│
   │                    │──────────────────>│
   │                    │  5. 验证结果         │
   │                    │<──────────────────│
   │                    │                    │
   │  6. JWT Token      │                    │
   │<──────────────────│                    │
```

#### zkLogin 验证流程

```
┌──────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│ 前端  │    │ OAuth      │    │ API GW    │    │ Sui RPC  │
└──┬───┘    │ Provider   │    └─────┬─────┘    └────┬─────┘
   │  1. OAuth 登录      │         │                │
   │───────────────────>│         │                │
   │  2. id_token       │         │                │
   │<───────────────────│         │                │
   │                     │         │                │
   │  3. 生成 zkProof            │                │
   │  (ephemeral keypair +       │                │
   │   id_token → zk 证明)       │                │
   │                              │                │
   │  4. {zkProof, ephemeralPK}  │                │
   │────────────────────────────>│                │
   │                              │  5. 验证 zkProof│
   │                              │───────────────>│
   │                              │  6. Sui 地址    │
   │                              │<───────────────│
   │  7. JWT Token                │                │
   │<────────────────────────────│                │
```

#### JWT Token 结构与生命周期

```python
# JWT Payload 结构
{
    "sub": "0x3f2a...8b1c",       # Sui 地址
    "auth_method": "wallet",       # "wallet" | "zklogin"
    "iat": 1715155200,             # 签发时间
    "exp": 1715241600,             # 过期时间 (24h)
    "jti": "uuid-v4",             # Token ID (防重放)
}

# 生命周期
# Access Token: 24 小时
# Refresh Token: 7 天 (HttpOnly Cookie)
# Nonce: 5 分钟有效 (Redis TTL)
```

### 2.3 WebSocket 管理（Cloudflare Workers + Durable Objects）

> 实现细节与 DO 路由命名以 **`docs/websocket-hub-design.md` §3.3** 为准（`idFromName(\`user:${userId}\`)`）；本节保留产品级行为（连接池、事件类型、背压）。

#### 连接管理

```
┌─────────────────────────────────────────────────────┐
│           WebSocket Hub（CF Worker + DO）            │
│                                                      │
│  连接池:                                             │
│  ┌──────────────────────────────────────────┐       │
│  │ user:0x3f2a → [ws_conn_1, ws_conn_2]    │       │
│  │ user:0x8b1c → [ws_conn_3]               │       │
│  │ ...                                      │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  心跳: 每 30s 发送 ping，客户端 10s 内响应 pong       │
│  重连: 客户端断线后指数退避 (1s, 2s, 4s, max 30s)    │
│  房间: 每个用户一个房间 (user:{address})              │
│  最大连接: 单用户 3 个连接，全局 1000 个连接           │
└─────────────────────────────────────────────────────┘
```

#### Durable Object 状态（摘要）

- **可存**：连接 id、订阅频道、心跳/Alarm 元数据、**有界**待发队列、短 TTL 展示快照（从 DE HTTP 拉取）。  
- **不可存**：权威业务数据、完整交易历史、Merkle/胜率等（仍在 PostgreSQL；Redis 仍为 Pub/Sub + 缓存，非主库）。

#### 事件路由

```
Decision Engine              WebSocket Hub (CF)              前端
     │                                 │                        │
     │  Redis Pub/Sub                  │                        │
     │  channel: panda:{id}:decision   │                        │
     │────────────────────────────────>│                        │
     │                                 │  WebSocket push        │
     │                                 │  event: panda.decision │
     │                                 │───────────────────────>│
     │                                 │                        │
     │  channel: panda:{id}:emotion    │                        │
     │────────────────────────────────>│                        │
     │                                 │  event: panda.emotion  │
     │                                 │───────────────────────>│
```

**WebSocket 事件类型：**

| 事件 | Payload | 触发条件 |
|------|---------|---------|
| `panda.decision` | `{action, score, price, pnl}` | 每次交易决策 |
| `panda.emotion` | `{from, to, trigger}` | 情绪状态跳转 |
| `panda.experience` | `{level, delta, source}` | 经验值变化 |
| `panda.diary` | `{content, mood, timestamp}` | 日记生成 |
| `market.tick` | `{pair, price, volume, rsi}` | 市场数据更新 |
| `merkle.committed` | `{root, tx_digest, count}` | Merkle Root 上链 |

#### 背压处理

```python
# 伪代码：WebSocket 背压控制
class WSBackpressure:
    MAX_QUEUE_SIZE = 100        # 每连接最大待发队列
    DROP_POLICY = "oldest"     # 队满时丢弃最旧消息

    async def push(self, conn, event):
        if conn.queue_size >= self.MAX_QUEUE_SIZE:
            if self.DROP_POLICY == "oldest":
                conn.queue.pop(0)       # 丢弃队头
            else:
                return                  # 丢弃新消息
        conn.queue.append(event)
        await conn.drain()
```

### 2.4 与 Decision Engine 的通信

**选择 HTTP REST 内部调用，理由：**

1. **简单性**：Next.js API Routes 原生支持 fetch，无需额外依赖
2. **调试友好**：HTTP 请求可直接用 curl/Postman 测试
3. **Vercel 边界**：Vercel Serverless **不承载** WebSocket 长连接；实时通道由 **Cloudflare Workers + DO** 实现（见 2.3）。Gateway 与 DE 之间仍用 HTTP REST。
4. **延迟可接受**：内部 REST 调用延迟 ~10ms，决策管线本身 <50ms，总计 <100ms 完全满足需求
5. **未来可替换**：如果延迟成为瓶颈，可在 Render 内部用 gRPC，Gateway 层保持 REST

#### 请求超时策略

| 端点类型 | 超时 | 说明 |
|---------|------|------|
| 决策管线 | 5s | 正常 <100ms，超时说明系统异常 |
| 策略解析 | 30s | 包含 DeepSeek API 调用 |
| Agent Coordinator | 10s | LLM 异步调用，3s 降级 |
| 日记生成 | 15s | LLM 批量生成 |

#### 重试策略

```python
# 伪代码：重试配置
RETRY_CONFIG = {
    "max_retries": 2,
    "backoff_base": 0.5,        # 500ms, 1000ms
    "retry_on": [502, 503, 504],
    "no_retry": [400, 401, 403, 404, 422],  # 客户端错误不重试
}
```

#### 断路器模式

```python
# 伪代码：断路器
class CircuitBreaker:
    FAILURE_THRESHOLD = 5       # 连续 5 次失败 → 熔断
    RECOVERY_TIMEOUT = 30       # 30s 后尝试半开
    HALF_OPEN_MAX = 2           # 半开状态允许 2 个请求

    states = ["CLOSED", "OPEN", "HALF_OPEN"]

    # CLOSED: 正常转发
    # OPEN:   直接返回 503 "Decision Engine unavailable"
    # HALF_OPEN: 放行少量请求，成功则关闭，失败则重新打开
```

---

## 三、Decision Engine (Python · Render)

### 3.1 服务架构

```
decision_engine/
├── main.py                     # FastAPI 入口，Uvicorn 启动
├── config.py                   # 环境变量、常量
│
├── actors/
│   ├── actor_manager.py        # ActorManager — 管理所有 PandaActor
│   ├── panda_actor.py          # PandaActor — 单只熊猫 Actor
│   └── messages.py             # Actor 消息类型定义
│
├── pipeline/
│   ├── rule_engine.py          # Step 1: 规则引擎信号匹配
│   ├── proficiency.py          # Step 2: 策略熟练度噪声
│   ├── personality_filter.py   # Step 3: 性格过滤
│   ├── environment.py          # Step 4: 环境适配 (Lv.1-4)
│   ├── emotion.py              # Step 5: 情绪扭曲系数
│   ├── social.py               # Step 6: 社交偏移
│   ├── fusion.py               # Step 7: 决策融合
│   └── risk_check.py           # Step 8: 风控检查
│
├── strategy/
│   ├── parser.py               # DeepSeek V3 策略解析
│   ├── cache.py                # 策略缓存 (相同文本不重复解析)
│   └── validator.py            # 解析结果验证
│
├── emotion/
│   ├── state_machine.py        # 7 状态情绪状态机
│   └── coefficients.py         # 情绪系数表
│
├── experience/
│   ├── engine.py               # 经验引擎主模块
│   ├── pattern_memory.py       # 形态记忆
│   ├── asset_mastery.py        # 资产专精
│   ├── mistake_journal.py      # 错误反省
│   ├── cycle_wisdom.py         # 周期认知
│   └── relationship.py         # 社交关系
│
├── agent/
│   ├── coordinator.py          # Agent Coordinator (LLM 异步)
│   └── triggers.py             # 触发条件判断
│
├── market/
│   ├── consumer.py             # Redis SUBSCRIBE market:tick:* → ActorManager
│   └── schemas.py              # MarketEvent 反序列化（与 monitor 契约一致）
│
├── deepbook/
│   └── simulator.py            # MVP 链下模拟成交（非行情采集）
│
├── llm/
│   ├── client.py               # DeepSeek V3 API 封装
│   ├── pool.py                 # 连接池 / 请求队列
│   ├── prompts.py              # Prompt 管理
│   └── cost_monitor.py         # 成本监控
│
├── trust/
│   ├── merkle_worker.py        # Merkle Root 计算与提交
│   └── sui_client.py           # Sui SDK 链上交互
│
├── walrus/
│   ├── sync_worker.py          # Walrus 同步 Worker
│   └── restore.py              # Walrus 恢复流程
│
├── engine/
│   ├── broadcaster.py          # Redis PUBLISH panda:* 事件
│   └── cache.py                # 市场数据缓存
│
├── db/
│   ├── models.py               # SQLAlchemy 模型
│   ├── repository.py           # Repository 层
│   └── migrations/             # Alembic 迁移
│
├── scheduler/
│   └── tasks.py                # APScheduler 定时任务
│
└── tests/
    ├── test_pipeline.py
    ├── test_actors.py
    ├── test_emotion.py
    └── ...
```

**模块依赖关系图：**

```
                    ┌──────────┐
                    │  main.py │
                    │ (FastAPI)│
                    └────┬─────┘
                         │
              ┌──────────▼──────────┐
              │    ActorManager     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │     PandaActor      │
              └──┬───┬───┬───┬──┬──┘
                 │   │   │   │  │
    ┌────────────┘   │   │   │  └────────────┐
    │                │   │   │               │
    ▼                ▼   │   ▼               ▼
┌────────┐  ┌────────┐  │  ┌────────┐  ┌────────┐
│Pipeline│  │Emotion │  │  │Experien│  │Agent   │
│(8步)   │  │Machine │  │  │Engine  │  │Coord.  │
└───┬────┘  └────────┘  │  └───┬────┘  └───┬────┘
    │                    │      │            │
    │                    ▼      │            ▼
    │              ┌─────────┐  │      ┌─────────┐
    │              │DeepBook │  │      │ LLM     │
    │              │集成层   │  │      │ Client  │
    │              └─────────┘  │      └─────────┘
    │                           │
    └───────────┬───────────────┘
                ▼
         ┌────────────┐     ┌──────────┐
         │ PostgreSQL │     │  Redis   │
         │ (Supabase) │     │  Cloud   │
         └────────────┘     └──────────┘
```

### 3.2 Actor 系统

#### PandaActor 类设计

```python
# 伪代码：PandaActor
class PandaActor:
    """每只熊猫是独立的 Actor，拥有独立状态和消息队列"""

    # === 状态 ===
    panda_id: str                      # NFT 对象 ID
    personality: Personality           # 性格五轴 (链上读取，不可变)
    strategy: Strategy                 # 当前策略 (解析后的结构化规则)
    emotion: EmotionState              # 当前情绪状态
    experience_cache: ExperienceCache  # 经验热缓存 (从 PostgreSQL 加载)
    simulation: SimulationState        # 模拟盘状态 (资金/持仓/历史)
    is_active: bool                    # 是否正在交易
    last_active: datetime              # 最后活跃时间
    env_level: int                     # 环境感知等级 (1-4)

    # === 消息邮箱 ===
    mailbox: asyncio.Queue             # 消息队列 (无界)

    # === 消息处理 ===
    async def handle_message(self, msg: ActorMessage):
        match msg.type:
            case "market_tick":
                await self._on_market_tick(msg.data)
            case "start_simulation":
                await self._on_start(msg.data)
            case "stop_simulation":
                await self._on_stop()
            case "feed_strategy":
                await self._on_feed_strategy(msg.data)
            case "ask_question":
                await self._on_ask_question(msg.data)
            case "fast_forward":
                await self._on_fast_forward(msg.data)

    async def _on_market_tick(self, tick: MarketTick):
        """核心决策循环"""
        if not self.is_active:
            return

        # 8 步决策管线
        decision = await self.pipeline.execute(
            tick=tick,
            personality=self.personality,
            strategy=self.strategy,
            emotion=self.emotion,
            experience=self.experience_cache,
            env_level=self.env_level,
        )

        # 执行模拟交易
        if decision.action != "HOLD":
            trade_result = self.simulation.execute(decision, tick.price)
            # 更新经验
            await self.experience_engine.record(trade_result)
            # 更新情绪
            self.emotion = self.emotion_machine.transition(trade_result)
            # 发布事件 → Redis Pub/Sub → WebSocket → 前端
            await self.publish_event("panda.decision", decision)

        # 每 50 笔触发 Merkle Root
        if self.simulation.trade_count % 50 == 0:
            await self.merkle_worker.submit(self.simulation.recent_logs)

    # === 生命周期 ===
    # 创建:   用户首次开始模拟 → ActorManager.get_or_create(panda_id)
    # 加载:   从 PostgreSQL 加载经验缓存 + 从链上读取性格
    # 运行:   处理消息循环 (asyncio.create_task)
    # 休眠:   5 分钟无消息 → 刷新经验到 DB → 释放内存缓存 → 保留 Actor 壳
    # 销毁:   用户显式停止 or 30 分钟无活动 → 完整持久化 → 移除 Actor
```

#### ActorManager

```python
# 伪代码：ActorManager
class ActorManager:
    """管理所有 PandaActor 的生命周期"""

    actors: dict[str, PandaActor]      # panda_id → Actor
    max_actors: int = 100              # 单实例最大 Actor 数

    async def get_or_create(self, panda_id: str) -> PandaActor:
        """懒加载：首次访问时创建 Actor"""
        if panda_id not in self.actors:
            if len(self.actors) >= self.max_actors:
                await self._evict_idle_actor()
            actor = await PandaActor.create(panda_id)
            self.actors[panda_id] = actor
            asyncio.create_task(actor.run())  # 启动消息循环
        return self.actors[panda_id]

    async def broadcast_market_tick(self, tick: MarketTick):
        """广播市场数据到所有活跃 Actor"""
        for actor in self.actors.values():
            if actor.is_active:
                await actor.mailbox.put(
                    ActorMessage(type="market_tick", data=tick)
                )

    async def _evict_idle_actor(self):
        """驱逐最久未活动的 Actor"""
        oldest = min(self.actors.values(), key=lambda a: a.last_active)
        await oldest.shutdown()
        del self.actors[oldest.panda_id]

    # 定时巡检：每 5 分钟扫描，休眠/销毁空闲 Actor
    async def housekeeping(self):
        now = datetime.utcnow()
        for actor in list(self.actors.values()):
            idle = (now - actor.last_active).total_seconds()
            if idle > 1800:       # 30 min → 销毁
                await actor.shutdown()
                del self.actors[actor.panda_id]
            elif idle > 300:      # 5 min → 休眠
                await actor.hibernate()
```

#### 市场数据消费（方案 B：独立 market-monitor）

行情采集已迁至 **`market-monitor/`**（见 `docs/market-monitor-design.md`）。Decision Engine 仅消费 Redis：

```
┌─────────────────────┐     Redis Pub/Sub       ┌─────────────────────────┐
│ market-monitor/     │     market:tick:{pair}  │ Decision Engine         │
│ DeepBook v3 →       │────────────────────────>│ MarketDataConsumer      │
│ K线 + 指标 → PUBLISH │                         │ → ActorManager.broadcast│
└─────────────────────┘                         │   → PandaActor._tick    │
                                                └─────────────────────────┘
```

### 3.3 8 步决策管线

每次市场数据更新时（每 1 分钟或每笔新 K 线），管线串行执行 8 步：

| 步骤 | 名称 | 输入 | 输出 | 延迟 |
|------|------|------|------|------|
| Step 1 | 策略信号匹配 | `market_data`, `strategy.signal_rules[]` | `signed_vote`, `direction`, `S_raw=|vote|` | <5ms |
| Step 2 | 策略熟练度噪声 | `raw_signal`, `proficiency`, `boldness` | `noisy_signal: float` | <1ms |
| Step 3 | 性格过滤 | `noisy_signal`, `personality` | `filtered_signal: float` | <1ms |
| Step 4 | 环境适配 | `filtered_signal`, `env_level`, `market_state` | `adapted_signal: float` | <5ms |
| Step 5 | 情绪扭曲 | `adapted_signal`, `emotion_state` | `emotional_signal: float` | <1ms |
| Step 6 | 社交偏移 | `emotional_signal`, `social_data`, `contrarian` | `social_signal: float` | <1ms |
| Step 7 | 决策融合 | `social_signal` | `action: BUY/SELL/HOLD`, `score: float` | <1ms |
| Step 8 | 风控检查 | `action`, `position`, `risk_mgmt` | `final_action`, `position_size` | <5ms |

**总延迟：<20ms（本地计算，无网络 I/O）**

```python
# 伪代码：管线执行
class DecisionPipeline:
    async def execute(self, tick, personality, strategy, emotion,
                      experience, env_level) -> Decision:
        # Step 1: 策略信号匹配
        raw = self.rule_engine.match(tick, strategy.signal_rules)

        # Step 2: 熟练度噪声
        noisy = strategy.apply_proficiency_noise(raw, personality)

        # Step 3: 性格过滤
        filtered = personality.filter_signal(noisy)
        # boldness_factor = 0.7 + (boldness/100) * 0.6  → [0.7, 1.3]

        # Step 4: 环境适配
        adapted = self.environment.adapt(filtered, env_level, tick)
        # 未感知的市场状态 → ×0.7

        # Step 5: 情绪扭曲
        emotional = emotion.apply_coefficient(adapted)
        # 贪婪时 ×1.6，恐慌时 ×0.3

        # Step 6: 社交偏移
        social = personality.contrarian_bias(self.social.get_signal())
        final_score = emotional + social  # [-0.2, +0.2]

        # Step 7: 决策融合
        if final_score > 0.65:
            action = "BUY"
        elif final_score < 0.40:
            action = "SELL"
        else:
            action = "HOLD"

        # Step 8: 风控
        action, size = self.risk_check.validate(
            action, final_score, strategy.risk_mgmt,
            current_position=..., daily_pnl=...
        )

        return Decision(action=action, score=final_score, size=size)
```

### 3.4 Agent Coordinator

Agent Coordinator 是异步 LLM 增强层，在特殊场景下触发，为决策提供更深层分析。

#### 触发条件判断逻辑

```python
# 伪代码：Agent 触发条件
class AgentTrigger:
    """判断是否需要触发 Agent Coordinator"""

    def should_trigger(self, context: DecisionContext) -> bool:
        # 1. 关键时刻：大仓位决策（>20% 总资金）
        if context.position_size_pct > 0.20:
            return True

        # 2. 矛盾信号：策略信号与经验信号方向相反
        if context.strategy_signal * context.experience_signal < 0:
            return True

        # 3. 异常市场：波动率突破 2 倍历史均值
        if context.volatility > context.avg_volatility * 2:
            return True

        # 4. 情绪极端：贪婪或恐慌状态
        if context.emotion in ("greedy", "panicking"):
            return True

        # 5. 经验不足：该资产交易次数 < 10
        if context.asset_trade_count < 10:
            return True

        return False
```

#### DeepSeek V3 API 调用封装

```python
# 伪代码：Agent Coordinator 调用
class AgentCoordinator:
    TIMEOUT = 3.0  # 3 秒超时

    async def analyze(self, context: DecisionContext) -> AgentAdvice:
        prompt = self.build_prompt(context)
        try:
            response = await asyncio.wait_for(
                self.llm_client.chat(prompt),
                timeout=self.TIMEOUT,
            )
            return self.parse_advice(response)
        except asyncio.TimeoutError:
            return self.fallback_advice(context)

    def fallback_advice(self, context: DecisionContext) -> AgentAdvice:
        """超时降级：使用规则引擎的原始决策"""
        return AgentAdvice(
            action=context.pipeline_decision.action,
            confidence=0.5,
            reason="Agent 超时，使用规则引擎决策",
            source="fallback",
        )
```

#### 响应缓存

```python
# 相似市场状况 + 相同策略 → 缓存 Agent 建议 5 分钟
# 缓存 Key = hash(strategy_id + market_state_bucket + emotion)
# market_state_bucket: 将连续市场数据离散化为状态桶
```

### 3.5 策略解析服务

#### DeepSeek V3 Prompt 管理

```python
STRATEGY_PARSE_PROMPT = """
你是 TradingPanda 的策略解析器。将用户的自然语言交易策略解析为结构化 JSON。

输出格式：
{
    "philosophy": "交易哲学简述",
    "positionSizing": {
        "type": "fixed" | "kelly" | "volatility_adjusted",
        "value": 0.05,
        "maxPosition": 0.30
    },
    "signalRules": [
        {
            "indicator": "RSI" | "MA" | "MACD" | "VOLUME" | "PRICE",
            "condition": "below" | "above" | "cross_above" | "cross_below",
            "threshold": 30,
            "timeframe": "1h",
            "weight": 1.0
        }
    ],
    "riskMgmt": {
        "stopLoss": 0.08,
        "takeProfit": 0.15,
        "maxDailyLoss": 0.15,
        "maxDrawdown": 0.20,
        "trailingStop": null
    },
    "risk_warning": null | "危险行为描述"
}

规则：
1. 模糊指令（如"跌多了就买"）→ 推断合理阈值并标注 inferred=true
2. 危险策略（如"全仓梭哈"）→ 生成 risk_warning
3. 未提及的字段使用安全默认值
4. 只输出 JSON，无其他文本
"""
```

#### 解析结果验证

```python
# 伪代码：策略验证
class StrategyValidator:
    def validate(self, parsed: dict) -> tuple[bool, list[str]]:
        errors = []

        # 必须有至少一条信号规则
        if not parsed.get("signalRules"):
            errors.append("缺少信号规则")

        # 仓位大小合理性
        sizing = parsed.get("positionSizing", {})
        if sizing.get("value", 0) > 0.5:
            errors.append("单笔仓位超过 50%，风险过高")

        # 止损必须存在
        risk = parsed.get("riskMgmt", {})
        if not risk.get("stopLoss"):
            errors.append("缺少止损设置")
            risk["stopLoss"] = 0.10  # 强制默认 10% 止损

        # 指标有效性
        valid_indicators = {"RSI", "MA", "MA20", "MACD", "VOLUME", "PRICE", "BOLL"}
        for rule in parsed.get("signalRules", []):
            if rule.get("indicator", "").upper() not in valid_indicators:
                errors.append(f"未知指标: {rule.get('indicator')}")

        return len(errors) == 0, errors
```

#### 策略缓存

```python
# 相同策略文本不重复解析
# 缓存 Key = SHA256(strategy_text.strip().lower())
# 缓存位置: PostgreSQL strategies 表 + Redis (TTL 24h)
# 命中缓存时直接返回解析结果，跳过 DeepSeek API 调用
```

### 3.6 情绪状态机

#### 7 状态实现

```
                         ┌─────────┐
                         │ Focused │ ← 默认初始状态
                         │  专注    │
                         └──┬───┬──┘
                   连赢3次 │   │ 单次大亏
                           ▼   ▼
                 ┌─────────┐   ┌──────────┐
                 │ Excited  │   │ Cautious │
                 │  兴奋    │   │  谨慎     │
                 └──┬──┬───┘   └──┬──┬────┘
            连赢5次│  │恢复     │  │回撤>10%
                   ▼  ▼        ▼  ▼
           ┌────────┐ ┌───┐  ┌────────┐ ┌──────────┐
           │ Greedy │ │ F │  │Panicking│ │ Cautious │
           │  贪婪   │ │   │  │  恐慌   │ │          │
           └────────┘ └───┘  └──┬──────┘ └──────────┘
                                │长期亏损
                                ▼
                          ┌──────────┐
                          │  Numb    │
                          │  麻木    │
                          └──────────┘

           (任何状态) ──── 连续5笔稳定盈利 ────→ Focused (重置)
```

#### 状态跳转触发器

```python
# 伪代码：情绪状态机
class EmotionStateMachine:
    TRANSITIONS = {
        "focused": {
            "win_streak_3":   "excited",
            "big_loss":       "cautious",    # 单笔亏损 > 5%
        },
        "excited": {
            "win_streak_5":   "greedy",
            "stable_5":       "focused",     # 连续 5 笔稳定
            "loss":           "focused",
        },
        "greedy": {
            "loss":           "excited",
            "big_loss":       "cautious",
            "stable_5":       "focused",
        },
        "cautious": {
            "drawdown_10pct": "panicking",
            "win_streak_3":   "focused",
            "stable_5":       "focused",
        },
        "panicking": {
            "prolonged_loss": "numb",        # 连续亏损 > 10 笔
            "win_streak_3":   "cautious",
            "stable_5":       "focused",
        },
        "numb": {
            "win_streak_5":   "focused",
            "stable_5":       "focused",
        },
    }

    # 情绪对决策的影响系数
    COEFFICIENTS = {
        "focused":    1.0,    # 无偏差
        "excited":    1.15,   # 信号放大 15%
        "greedy":     1.6,    # 信号放大 60% — 仓位偏大
        "cautious":   0.7,    # 信号缩小 30% — 趋于保守
        "panicking":  0.3,    # 信号大幅缩小 — 几乎不敢操作
        "numb":       0.5,    # 麻木 — 反应迟钝
    }

    def transition(self, current: str, event: str) -> str:
        return self.TRANSITIONS.get(current, {}).get(event, current)

    def get_coefficient(self, state: str, personality: Personality) -> float:
        """情绪系数受性格调节"""
        base = self.COEFFICIENTS[state]
        # 情绪稳定性 = (patience + focus) / 2
        stability = (personality.patience + personality.focus) / 200
        # 实际偏差 = 理论偏差 × (1 - 稳定性)
        deviation = (base - 1.0) * (1 - stability)
        return 1.0 + deviation
```

#### 情绪事件发布

```python
# 每次情绪跳转时，通过 Redis Pub/Sub 发布事件
# channel: panda:{panda_id}:emotion（决策链见 trades.decision_details；Redis 全表见 docs/redis-architecture.md §5）
# payload: {
#     "from": "focused",
#     "to": "excited",
#     "trigger": "win_streak_3",
#     "coefficient": 1.12,
#     "timestamp": 1715155200
# }
# → API Gateway 订阅 → WebSocket 推送 → 前端更新熊猫表情
```

### 3.7 经验引擎

#### 5 个子系统的数据读写

| 子系统 | PostgreSQL 表 | 读频率 | 写频率 |
|--------|--------------|--------|--------|
| pattern_memory | `pattern_memories` | 每次决策 (缓存) | 每次交易完成 |
| asset_mastery | `asset_masteries` | 每次决策 (缓存) | 每笔交易 |
| mistake_journal | `mistake_journals` | Agent 触发时 | 亏损交易后 |
| cycle_wisdom | `cycle_wisdoms` | 环境适配时 (缓存) | 市场状态切换时 |
| relationship | `relationships` | 排行榜更新时 | 社交事件触发 |

```python
# 伪代码：经验引擎
class ExperienceEngine:
    async def record_trade(self, trade: TradeResult, panda_id: str):
        """交易完成后更新所有子系统"""
        # 1. 形态记忆：记录市场形态 hash + 结果
        pattern_hash = self.compute_pattern_hash(trade.market_snapshot)
        await self.pattern_memory.upsert(panda_id, pattern_hash, trade.pnl > 0)

        # 2. 资产专精：该资产交易次数 +1，更新胜率
        await self.asset_mastery.increment(panda_id, trade.asset, trade.pnl > 0)

        # 3. 错误反省：亏损时记录错误类型
        if trade.pnl < 0:
            error_type = self.classify_error(trade)
            await self.mistake_journal.add(panda_id, error_type, trade)

        # 4. 周期认知：当前市场状态持续时间更新
        await self.cycle_wisdom.update(panda_id, trade.market_state)

    def compute_experience_level(self, panda_id: str) -> int:
        """计算经验等级 0-100"""
        total_trades = self.get_total_trades(panda_id)
        unique_patterns = self.get_unique_patterns(panda_id)
        win_rate = self.get_win_rate(panda_id)
        # 综合公式（详见 agent-design.md）
        level = min(100, int(
            total_trades * 0.3 +
            unique_patterns * 0.3 +
            win_rate * 40 * 0.4
        ))
        return level
```

#### PostgreSQL 查询优化

```sql
-- pattern_memories 表索引
CREATE INDEX idx_pattern_panda_hash ON pattern_memories (panda_id, pattern_hash);
CREATE INDEX idx_pattern_panda_recent ON pattern_memories (panda_id, last_seen DESC);

-- asset_masteries 表索引
CREATE INDEX idx_asset_panda ON asset_masteries (panda_id, asset);

-- 热查询：获取熊猫最近 100 个形态记忆（决策时用）
-- 使用覆盖索引避免回表
SELECT pattern_hash, win_count, total_count, last_seen
FROM pattern_memories
WHERE panda_id = $1
ORDER BY last_seen DESC
LIMIT 100;
```

#### Walrus 同步 Worker

```python
# 伪代码：Walrus 同步
class WalrusSyncWorker:
    async def sync(self, panda_id: str):
        """将经验数据同步到 Walrus"""
        # 1. 从 PostgreSQL 读取全部经验数据
        experience = await self.db.get_all_experience(panda_id)

        # 2. JSON 序列化
        payload = json.dumps(experience, default=str)

        # 3. 上传到 Walrus
        blob_id = await self.walrus_client.store(payload)

        # 4. 写回 PostgreSQL (记录 blob_id)
        await self.db.update_walrus_blob_id(panda_id, blob_id)

        # 5. 更新链上 dynamic_field
        await self.sui_client.update_dynamic_field(
            panda_id, "walrus_blob_id", blob_id
        )
```

### 3.8 快进模式

快进模式允许用户加速回放历史数据，让熊猫快速积累经验。

#### 规则引擎独立运行

```python
# 伪代码：快进模式
class FastForwardEngine:
    """快进模式：规则引擎独立运行，不调用 LLM"""

    async def run(self, panda_id: str, market_data: list[MarketTick],
                  speed: int = 10):
        """
        speed: 倍速 (10x = 每秒处理 10 根 K 线)
        market_data: 历史 K 线数据序列
        """
        actor = await self.actor_manager.get_or_create(panda_id)
        key_moments = []

        for i, tick in enumerate(market_data):
            # 仅使用规则引擎 + 性格 + 情绪（不触发 Agent Coordinator）
            decision = actor.pipeline.execute_fast(
                tick=tick,
                skip_agent=True,
                skip_social=True,
            )

            if decision.action != "HOLD":
                trade_result = actor.simulation.execute(decision, tick.price)
                await actor.experience_engine.record(trade_result)
                actor.emotion = actor.emotion_machine.transition(trade_result)

                # 标记关键时刻
                if self._is_key_moment(trade_result, actor.emotion):
                    key_moments.append({
                        "index": i,
                        "tick": tick,
                        "decision": decision,
                        "emotion": actor.emotion,
                        "pnl": trade_result.pnl,
                    })

            # 控制速度：每 speed 根 K 线推送一次进度
            if i % speed == 0:
                await actor.publish_event("fastforward.progress", {
                    "current": i,
                    "total": len(market_data),
                    "equity": actor.simulation.equity,
                })

        return key_moments
```

#### 事后日记批量生成

```python
# 快进完成后，对关键时刻批量生成日记
async def generate_diaries(self, key_moments: list[dict], panda_id: str):
    """批量调用 DeepSeek V3 生成日记"""
    # 每 5 个关键时刻合并为一次 LLM 调用
    batches = [key_moments[i:i+5] for i in range(0, len(key_moments), 5)]

    for batch in batches:
        prompt = self.build_diary_prompt(batch, panda_id)
        diaries = await self.llm_client.chat(prompt)
        for diary in diaries:
            await self.db.save_diary(panda_id, diary)
```

#### 关键时刻标记算法

```python
def _is_key_moment(self, trade: TradeResult, emotion: str) -> bool:
    """判断是否为值得记录的关键时刻"""
    # 1. 大盈大亏 (PnL > 5% 或 < -5%)
    if abs(trade.pnl_pct) > 5.0:
        return True
    # 2. 情绪极端状态下的交易
    if emotion in ("greedy", "panicking", "numb"):
        return True
    # 3. 连续交易方向反转 (之前买现在卖)
    if trade.is_direction_reversal:
        return True
    # 4. 首次交易某资产
    if trade.is_first_trade_on_asset:
        return True
    # 5. 里程碑交易 (第 10/50/100/500 笔)
    if trade.total_count in (10, 50, 100, 500):
        return True
    return False
```

---

## 四、DeepBook 集成层

> **行情采集**在 **`market-monitor/`**（DeepBook **v3**、`0xdee9::deepbook::*`）。本节仅保留 DE 侧**模拟执行**与契约引用；完整设计见 **`docs/market-monitor-design.md`**。

### 4.1 数据源服务（已迁至 market-monitor）

#### Sui RPC 事件查询（实现位于 `market-monitor/feed/`）

```python
# 伪代码：DeepBook v3 事件轮询（独立服务，非 DE 进程内）
class DeepBookDataFeed:
    """从 DeepBook v3 链上事件构建市场数据并 PUBLISH Redis"""

    SUI_RPC_URL = "https://fullnode.testnet.sui.io:443"

    # DeepBook v3（勿使用 clob_v2）
    EVENT_TYPES = [
        "0xdee9::deepbook::OrderFilled",
        "0xdee9::deepbook::OrderPlaced",
        "0xdee9::deepbook::OrderCancelled",
        "0xdee9::deepbook::SwapEvent",
    ]

    async def subscribe_events(self, pool_id: str):
        """WebSocket 订阅 DeepBook 事件"""
        async with websockets.connect(self.SUI_RPC_URL) as ws:
            await ws.send(json.dumps({
                "jsonrpc": "2.0",
                "method": "suix_subscribeEvent",
                "params": [{
                    "MoveEventType": "0xdee9::clob_v2::OrderFilled",
                    "Package": "0xdee9",
                }],
            }))
            async for msg in ws:
                event = json.loads(msg)
                await self.process_event(event)

    async def poll_events(self, pool_id: str, cursor: str = None):
        """轮询方式获取事件 (备选方案)"""
        resp = await self.rpc_call("suix_queryEvents", {
            "query": {"MoveEventType": "0xdee9::clob_v2::OrderFilled"},
            "cursor": cursor,
            "limit": 100,
            "descending_order": False,
        })
        return resp["data"], resp.get("nextCursor")
```

#### K 线重建算法

```python
# 伪代码：从 OrderFilled 事件构建 OHLCV
class KlineBuilder:
    def __init__(self, interval_seconds: int = 60):
        self.interval = interval_seconds
        self.current_candle: dict = None
        self.candles: list[dict] = []

    def process_fill(self, event: dict):
        """处理成交事件，更新当前 K 线"""
        price = int(event["price"]) / 1e9  # DeepBook 价格精度
        volume = int(event["base_asset_quantity_filled"]) / 1e9
        timestamp = int(event["timestamp_ms"]) / 1000

        candle_start = int(timestamp // self.interval) * self.interval

        if self.current_candle is None or self.current_candle["t"] != candle_start:
            # 新 K 线
            if self.current_candle:
                self.candles.append(self.current_candle)
            self.current_candle = {
                "t": candle_start,
                "o": price, "h": price, "l": price, "c": price,
                "v": volume,
            }
        else:
            # 更新当前 K 线
            self.current_candle["h"] = max(self.current_candle["h"], price)
            self.current_candle["l"] = min(self.current_candle["l"], price)
            self.current_candle["c"] = price
            self.current_candle["v"] += volume
```

#### 技术指标计算

```python
# 伪代码：技术指标
class TechnicalIndicators:
    @staticmethod
    def rsi(closes: list[float], period: int = 14) -> float:
        """相对强弱指数"""
        if len(closes) < period + 1:
            return 50.0  # 数据不足，返回中性值
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d for d in deltas[-period:] if d > 0]
        losses = [-d for d in deltas[-period:] if d < 0]
        avg_gain = sum(gains) / period if gains else 0
        avg_loss = sum(losses) / period if losses else 1e-10
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    def ma(closes: list[float], period: int = 20) -> float:
        """移动平均线"""
        if len(closes) < period:
            return closes[-1]
        return sum(closes[-period:]) / period

    @staticmethod
    def macd(closes: list[float]) -> dict:
        """MACD (12, 26, 9)"""
        ema12 = TechnicalIndicators._ema(closes, 12)
        ema26 = TechnicalIndicators._ema(closes, 26)
        dif = ema12 - ema26
        # signal = EMA(dif, 9), histogram = dif - signal
        return {"dif": dif, "signal": 0, "histogram": 0}

    @staticmethod
    def volatility(closes: list[float], period: int = 20) -> float:
        """历史波动率 (标准差/均值)"""
        if len(closes) < period:
            return 0.02
        recent = closes[-period:]
        mean = sum(recent) / len(recent)
        variance = sum((x - mean) ** 2 for x in recent) / len(recent)
        return (variance ** 0.5) / mean if mean > 0 else 0
```

#### 数据缓存策略

```sql
-- market_data_cache 表
CREATE TABLE market_data_cache (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(20) NOT NULL,         -- e.g. "SUI/USDC"
    interval VARCHAR(5) NOT NULL,      -- "1m" | "5m" | "1h"
    timestamp BIGINT NOT NULL,
    open DECIMAL(20, 8),
    high DECIMAL(20, 8),
    low DECIMAL(20, 8),
    close DECIMAL(20, 8),
    volume DECIMAL(20, 8),
    rsi DECIMAL(5, 2),
    ma20 DECIMAL(20, 8),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pair, interval, timestamp)
);

CREATE INDEX idx_market_pair_time ON market_data_cache (pair, interval, timestamp DESC);
```

**更新频率：** 每 1 分钟从 DeepBook 拉取最新事件 → 更新 K 线 → 重算指标 → 写入缓存

**RPC Rate Limiting 处理：**
- Sui 公共 RPC 限流：~50 req/s
- 策略：批量查询 (每次 100 条事件)，间隔 2s
- 降级：如果 RPC 超限，使用缓存数据 + 标记 stale

### 4.2 模拟执行服务

#### DeepBook Testnet SDK 调用

```python
# 伪代码：DeepBook 模拟执行
class DeepBookSimulator:
    """通过 DeepBook testnet 提交模拟订单"""

    async def place_limit_order(self, pool_id: str, side: str,
                                 price: float, quantity: float) -> dict:
        """提交限价单到 DeepBook testnet"""
        tx = TransactionBlock()
        tx.move_call(
            target="0xdee9::clob_v2::place_limit_order",
            arguments=[
                tx.object(pool_id),
                tx.pure(int(price * 1e9)),
                tx.pure(int(quantity * 1e9)),
                tx.pure(side == "bid"),
                # ... 其他参数
            ],
        )
        result = await self.sui_client.execute(tx)
        return self.parse_order_result(result)

    async def get_order_status(self, pool_id: str, order_id: str) -> dict:
        """查询订单状态（是否成交/部分成交）"""
        pass
```

#### 滑点/部分成交/手续费模拟

```python
# 伪代码：交易成本模拟
class TradeCostSimulator:
    TAKER_FEE = 0.001        # 0.1% taker 手续费
    MAKER_FEE = 0.0005       # 0.05% maker 手续费

    def simulate_execution(self, side: str, size: float,
                           price: float, orderbook: dict) -> dict:
        """模拟订单执行，计算实际成交均价"""
        # 1. 滑点：根据订单簿深度计算
        slippage = self._calc_slippage(side, size, orderbook)
        exec_price = price * (1 + slippage) if side == "buy" else price * (1 - slippage)

        # 2. 部分成交：如果订单簿流动性不足
        available = self._calc_available_liquidity(side, price, orderbook)
        filled_pct = min(1.0, available / size)

        # 3. 手续费
        fee = size * exec_price * self.TAKER_FEE

        return {
            "exec_price": exec_price,
            "filled_pct": filled_pct,
            "slippage_pct": slippage * 100,
            "fee": fee,
        }
```

#### Fallback：本地模拟

```python
# 如果 DeepBook testnet 不可用，降级到本地模拟
class LocalSimulator:
    """纯本地模拟引擎（无链上交互）"""

    def execute(self, decision: dict, price: float,
                capital: float) -> TradeResult:
        """简化的本地模拟（与 Demo 中 PaperEngine 一致）"""
        trade_value = capital * decision["size"]

        if decision["action"] == "BUY":
            position = trade_value / price
            fee = trade_value * 0.001
            return TradeResult(
                action="BUY", price=price,
                position=position, fee=fee,
            )
        elif decision["action"] == "SELL":
            revenue = self.position * price
            fee = revenue * 0.001
            pnl = revenue - self.entry_value - fee
            return TradeResult(
                action="SELL", price=price,
                pnl=pnl, fee=fee,
            )
```

---

## 五、LLM 统一服务

### 5.1 DeepSeek V3 API 封装

```python
# 伪代码：LLM 客户端
class DeepSeekClient:
    BASE_URL = "https://api.deepseek.com/v1"
    MODEL = "deepseek-chat"

    def __init__(self, api_key: str, max_concurrent: int = 5):
        self.api_key = api_key
        self.semaphore = asyncio.Semaphore(max_concurrent)  # 并发限制
        self.session = aiohttp.ClientSession()
        self.cost_monitor = CostMonitor()

    async def chat(self, messages: list[dict],
                   temperature: float = 0.1,
                   max_tokens: int = 500) -> str:
        """发送聊天请求"""
        async with self.semaphore:  # 并发控制
            body = {
                "model": self.MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            async with self.session.post(
                f"{self.BASE_URL}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                data = await resp.json()
                # 成本监控
                usage = data.get("usage", {})
                self.cost_monitor.record(
                    input_tokens=usage.get("prompt_tokens", 0),
                    output_tokens=usage.get("completion_tokens", 0),
                )
                return data["choices"][0]["message"]["content"]

    async def close(self):
        await self.session.close()
```

#### 连接池管理

```python
# 并发限制：最多 5 个并发请求到 DeepSeek
# 请求队列：超出并发限制时排队等待 (asyncio.Semaphore)
# 超时重试：单次超时 30s，最多重试 1 次
# 速率限制：DeepSeek V3 API 限制 ~60 RPM，通过 semaphore 控制
```

#### 成本监控

```python
class CostMonitor:
    INPUT_PRICE_PER_M = 0.27    # $/M tokens (DeepSeek V3)
    OUTPUT_PRICE_PER_M = 1.10   # $/M tokens

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.daily_cost = 0.0
        self.daily_calls = 0

    def record(self, input_tokens: int, output_tokens: int):
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        cost = (
            input_tokens * self.INPUT_PRICE_PER_M / 1_000_000 +
            output_tokens * self.OUTPUT_PRICE_PER_M / 1_000_000
        )
        self.daily_cost += cost
        self.daily_calls += 1

    def get_daily_report(self) -> dict:
        return {
            "calls": self.daily_calls,
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "cost_usd": round(self.daily_cost, 4),
        }
```

### 5.2 Prompt 管理

所有 Prompt 集中管理，支持版本控制：

```python
# 伪代码：Prompt 管理
class PromptManager:
    PROMPTS = {
        # === 策略解析 ===
        "strategy_parse": {
            "version": "1.0",
            "system": "你是 TradingPanda 的策略解析器...",
            "user_template": "用户策略：{strategy_text}",
            "temperature": 0.1,
            "max_tokens": 500,
        },

        # === Agent Coordinator ===
        "agent_coordinator": {
            "version": "1.0",
            "system": """你是熊猫 {panda_name} 的交易顾问。
当前情绪：{emotion}，经验等级：{level}。
基于以下市场状况和熊猫经验，给出交易建议。
输出 JSON: {"action": "BUY/SELL/HOLD", "confidence": 0-1, "reason": "..."}""",
            "user_template": """
市场数据：{market_data}
策略信号：{strategy_signal}
经验记忆：{experience_summary}
当前持仓：{position}
""",
            "temperature": 0.3,
            "max_tokens": 300,
        },

        # === 熊猫日记 ===
        "panda_diary": {
            "version": "1.0",
            "system": """你是一只正在学习交易的熊猫，性格特征：
胆识 {boldness}/100, 耐性 {patience}/100, 直觉 {intuition}/100。
用第一人称写一篇简短的交易日记（50-100字），
语气要符合你的性格和当前情绪 ({emotion})。
日记要提到具体的交易决策和感受。""",
            "user_template": "今天的关键交易：{key_trades}",
            "temperature": 0.7,
            "max_tokens": 200,
        },
    }

    def get_prompt(self, name: str, **kwargs) -> list[dict]:
        """获取格式化后的 Prompt"""
        template = self.PROMPTS[name]
        return [
            {"role": "system", "content": template["system"].format(**kwargs)},
            {"role": "user", "content": template["user_template"].format(**kwargs)},
        ]
```

**版本管理策略：**
- Prompt 版本存储在代码中 (Python dict)
- 每次修改 Prompt 更新版本号
- 策略解析结果的缓存 Key 包含 Prompt 版本（版本变更 → 缓存失效）
- 未来可迁移到数据库或配置中心

---

## 六、信任层

### 6.1 Merkle Root Worker

```python
# 伪代码：Merkle Root Worker
class MerkleRootWorker:
    BATCH_SIZE = 50  # 每 50 笔交易触发一次

    def __init__(self, sui_client: SuiClient, db: Database):
        self.sui_client = sui_client
        self.db = db
        self.pending_logs: dict[str, list] = {}  # panda_id → logs

    async def add_log(self, panda_id: str, log: DecisionLog):
        """添加决策日志到待处理队列"""
        if panda_id not in self.pending_logs:
            self.pending_logs[panda_id] = []
        self.pending_logs[panda_id].append(log)

        if len(self.pending_logs[panda_id]) >= self.BATCH_SIZE:
            await self.submit(panda_id)

    async def submit(self, panda_id: str):
        """计算 Merkle Root 并异步提交链上"""
        logs = self.pending_logs.pop(panda_id, [])
        if not logs:
            return

        # 1. 计算 Merkle Root
        root = self.compute_merkle_root(logs)

        # 2. 记录到 PostgreSQL (状态: pending)
        record_id = await self.db.insert_merkle_record({
            "panda_id": panda_id,
            "merkle_root": root,
            "log_count": len(logs),
            "status": "pending",
            "created_at": datetime.utcnow(),
        })

        # 3. 异步提交链上
        asyncio.create_task(self._submit_onchain(record_id, panda_id, root))

    async def _submit_onchain(self, record_id: int, panda_id: str, root: str):
        """异步提交 Merkle Root 到 Sui 链上"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                tx_digest = await self.sui_client.submit_merkle_root(
                    panda_id, root
                )
                await self.db.update_merkle_status(
                    record_id, "confirmed", tx_digest
                )
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # 指数退避
                else:
                    await self.db.update_merkle_status(
                        record_id, "failed", error=str(e)
                    )

    def compute_merkle_root(self, logs: list[DecisionLog]) -> str:
        """计算日志链的 Merkle Root (SHA-256)"""
        hashes = []
        for log in logs:
            data = f"{log.timestamp}|{log.action}|{log.final_score:.4f}|{log.trade_size:.4f}"
            hashes.append(hashlib.sha256(data.encode()).digest())

        while len(hashes) > 1:
            if len(hashes) % 2 == 1:
                hashes.append(hashes[-1])
            next_level = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i + 1]
                next_level.append(hashlib.sha256(combined).digest())
            hashes = next_level

        return hashes[0].hex() if hashes else ""
```

#### 状态追踪

```
Merkle Root 生命周期：

  pending ──────► submitted ──────► confirmed
                      │
                      │ (Sui TX 失败)
                      ▼
                   failed ──────► (重试 3 次) ──────► confirmed
                                                          │
                                                     (仍然失败)
                                                          ▼
                                                    permanent_fail
                                                    (告警 + 人工处理)
```

```sql
-- merkle_roots 表
CREATE TABLE merkle_roots (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    log_count INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | submitted | confirmed | failed | permanent_fail
    tx_digest VARCHAR(66),
    error TEXT,
    created_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    retry_count INT DEFAULT 0
);

CREATE INDEX idx_merkle_panda ON merkle_roots (panda_id, created_at DESC);
CREATE INDEX idx_merkle_status ON merkle_roots (status);
```

### 6.2 链上交互服务

```python
# 伪代码：Sui 链上交互
class SuiClient:
    def __init__(self, rpc_url: str, admin_keypair: Keypair):
        self.rpc_url = rpc_url
        self.keypair = admin_keypair
        self.client = SuiClient(rpc_url)

    async def submit_merkle_root(self, panda_id: str, root: str) -> str:
        """提交 Merkle Root 到链上 (调用 Move 合约)"""
        tx = TransactionBlock()
        tx.move_call(
            target=f"{PACKAGE_ID}::panda::submit_merkle_root",
            arguments=[
                tx.object(panda_id),
                tx.pure(bytes.fromhex(root)),
            ],
        )
        # 签名并执行
        result = await self.client.sign_and_execute_transaction(
            tx, self.keypair,
            options={"showEffects": True},
        )
        return result["digest"]

    async def update_dynamic_field(self, panda_id: str,
                                    field_name: str, value: str):
        """更新 NFT 的 dynamic_field"""
        tx = TransactionBlock()
        tx.move_call(
            target=f"{PACKAGE_ID}::panda::update_field",
            arguments=[
                tx.object(panda_id),
                tx.pure(field_name),
                tx.pure(value),
            ],
        )
        result = await self.client.sign_and_execute_transaction(
            tx, self.keypair,
        )
        return result["digest"]
```

#### 管理员钱包管理

```python
# 管理员钱包用于：
# 1. 提交 Merkle Root
# 2. 更新 dynamic_field (Walrus blob_id)
# 3. Gas 赞助 (可选)

# 安全措施：
# - 私钥通过环境变量注入，不存储在代码中
# - 钱包余额监控：低于 1 SUI 时告警
# - 日交易量上限：100 TX/天 (防止密钥泄露后的损失)
```

#### Gas 预估与管理

```python
class GasManager:
    MIN_BALANCE = 1_000_000_000  # 1 SUI (in MIST)
    ALERT_THRESHOLD = 5_000_000_000  # 5 SUI

    async def check_balance(self) -> int:
        """检查管理员钱包余额"""
        balance = await self.sui_client.get_balance(self.admin_address)
        if balance < self.ALERT_THRESHOLD:
            await self.alert("管理员钱包余额不足", balance)
        return balance

    async def estimate_gas(self, tx: TransactionBlock) -> int:
        """预估 Gas 费用"""
        dry_run = await self.sui_client.dry_run(tx)
        return dry_run["effects"]["gasUsed"]["computationCost"]
```

---

## 七、Walrus 同步服务

### 7.1 同步触发条件

| 触发条件 | 说明 | 优先级 |
|---------|------|--------|
| 每 50 笔交易 | 与 Merkle Root 同批次 | 常规 |
| 每日定时 (UTC 00:00) | 全量快照 | 常规 |
| NFT 转让前 | 强制同步最新数据 | 高 |
| 用户手动触发 | "备份我的熊猫" 按钮 | 低 |

### 7.2 同步流程

```
┌────────────┐    ┌──────────────┐    ┌─────────┐    ┌────────────┐    ┌──────────┐
│ PostgreSQL │    │ JSON 序列化  │    │ Walrus  │    │ PostgreSQL │    │ Sui 链上  │
│ 经验数据    │───>│ 5 子系统合并  │───>│ store() │───>│ 写回       │───>│ 更新      │
│            │    │ + 压缩       │    │ → blob_id│   │ blob_id    │    │ dynamic  │
│            │    │              │    │          │   │            │    │ _field   │
└────────────┘    └──────────────┘    └─────────┘    └────────────┘    └──────────┘
```

```python
# 伪代码：同步流程
class WalrusSyncService:
    async def sync_panda(self, panda_id: str):
        """完整同步流程"""
        # 1. 从 PostgreSQL 读取全部经验数据
        experience = {
            "pattern_memory": await self.db.get_patterns(panda_id),
            "asset_mastery": await self.db.get_masteries(panda_id),
            "mistake_journal": await self.db.get_mistakes(panda_id),
            "cycle_wisdom": await self.db.get_cycles(panda_id),
            "relationship": await self.db.get_relationships(panda_id),
            "metadata": {
                "panda_id": panda_id,
                "sync_time": datetime.utcnow().isoformat(),
                "version": "1.0",
                "trade_count": await self.db.get_trade_count(panda_id),
            },
        }

        # 2. JSON 序列化 + gzip 压缩
        payload = gzip.compress(json.dumps(experience, default=str).encode())

        # 3. 上传到 Walrus
        from walrus import WalrusClient
        client = WalrusClient()
        blob_id = await client.store(payload)

        # 4. 写回 PostgreSQL
        await self.db.update_walrus_sync(panda_id, blob_id)

        # 5. 更新链上 dynamic_field
        await self.sui_client.update_dynamic_field(
            panda_id, "walrus_blob_id", blob_id
        )

        return blob_id
```

### 7.3 恢复流程

```
NFT 转让后买家的数据恢复：

  ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌────────────┐
  │ Sui 链上  │    │ Walrus     │    │ JSON     │    │ PostgreSQL │
  │ 读取      │───>│ retrieve() │───>│ 反序列化  │───>│ 批量写入   │
  │ blob_id   │    │ → payload  │    │ + 解压   │    │ 5 子系统   │
  │ (dynamic  │    │            │    │          │    │ (新 owner) │
  │  _field)  │    │            │    │          │    │            │
  └──────────┘    └────────────┘    └──────────┘    └────────────┘
```

```python
class WalrusRestoreService:
    async def restore_panda(self, panda_id: str, new_owner: str):
        """NFT 转让后，恢复经验数据到新 owner"""
        # 1. 从链上读取 blob_id
        blob_id = await self.sui_client.get_dynamic_field(
            panda_id, "walrus_blob_id"
        )

        # 2. 从 Walrus 下载
        client = WalrusClient()
        payload = await client.retrieve(blob_id)
        experience = json.loads(gzip.decompress(payload))

        # 3. 批量写入 PostgreSQL (关联新 owner)
        async with self.db.transaction():
            await self.db.bulk_insert_patterns(
                panda_id, new_owner, experience["pattern_memory"]
            )
            await self.db.bulk_insert_masteries(
                panda_id, new_owner, experience["asset_mastery"]
            )
            await self.db.bulk_insert_mistakes(
                panda_id, new_owner, experience["mistake_journal"]
            )
            await self.db.bulk_insert_cycles(
                panda_id, new_owner, experience["cycle_wisdom"]
            )
            await self.db.bulk_insert_relationships(
                panda_id, new_owner, experience["relationship"]
            )

        # 4. 标记恢复完成
        await self.db.mark_restore_complete(panda_id, new_owner)
```

---

## 八、链上事件监听

### 8.1 事件订阅

```python
# 伪代码：链上事件监听器
class SuiEventListener:
    """监听 Sui 链上事件，同步到 PostgreSQL"""

    EVENTS = {
        f"{PACKAGE_ID}::panda::PandaMinted": "on_panda_minted",
        f"{PACKAGE_ID}::panda::PandaTransferred": "on_panda_transferred",
        f"{PACKAGE_ID}::panda::AchievementUnlocked": "on_achievement_unlocked",
    }

    async def start(self):
        """启动事件订阅"""
        async with websockets.connect(SUI_WS_URL) as ws:
            for event_type in self.EVENTS:
                await ws.send(json.dumps({
                    "jsonrpc": "2.0",
                    "method": "suix_subscribeEvent",
                    "params": [{"MoveEventType": event_type}],
                }))

            async for msg in ws:
                event = json.loads(msg)
                event_type = event.get("params", {}).get("result", {}).get("type")
                handler_name = self.EVENTS.get(event_type)
                if handler_name:
                    handler = getattr(self, handler_name)
                    await handler(event["params"]["result"])

    async def on_panda_minted(self, event: dict):
        """熊猫铸造 → 创建 PostgreSQL 记录"""
        parsed = event["parsedJson"]
        await self.db.create_panda({
            "panda_id": parsed["panda_id"],
            "owner": parsed["owner"],
            "boldness": parsed["boldness"],
            "patience": parsed["patience"],
            "intuition": parsed["intuition"],
            "focus": parsed["focus"],
            "contrarian": parsed["contrarian"],
            "talent": parsed["talent"],
            "created_at": datetime.utcnow(),
        })

    async def on_panda_transferred(self, event: dict):
        """熊猫转让 → 更新 owner + 触发 Walrus 恢复"""
        parsed = event["parsedJson"]
        panda_id = parsed["panda_id"]
        new_owner = parsed["new_owner"]

        # 1. 更新 PostgreSQL owner
        await self.db.update_panda_owner(panda_id, new_owner)

        # 2. 触发 Walrus 恢复
        await self.walrus_restore.restore_panda(panda_id, new_owner)

    async def on_achievement_unlocked(self, event: dict):
        """成就解锁 → 记录到 PostgreSQL"""
        parsed = event["parsedJson"]
        await self.db.record_achievement({
            "panda_id": parsed["panda_id"],
            "achievement_id": parsed["achievement_id"],
            "unlocked_at": datetime.utcnow(),
        })
```

---

## 九、后台任务

### 9.1 定时任务

| 任务 | 频率 | 耗时 | 说明 |
|------|------|------|------|
| 相关性矩阵重算 | 每日 02:00 UTC | ~30s | 计算所有交易对的价格相关性矩阵 |
| 市场数据缓存刷新 | 每 5 分钟 | ~5s | 从 DeepBook 拉取最新 K 线 |
| Walrus 定期同步 | 每日 03:00 UTC | ~60s/只 | 全量经验数据备份 |
| 排行榜更新 | 每 15 分钟 | ~10s | 重算全局/资产排行榜 |
| 休眠熊猫经验衰减 | 每周一 04:00 UTC | ~5s | 长期未活跃的熊猫经验轻微衰减 |
| Gas 余额检查 | 每小时 | ~1s | 管理员钱包余额监控 |
| LLM 成本日报 | 每日 23:59 UTC | ~1s | 汇总当日 DeepSeek API 消耗 |
| 死 Actor 清理 | 每 10 分钟 | ~1s | 清理超时未活动的 Actor |

### 9.2 任务调度

**选择 APScheduler，理由：**

1. **轻量级**：无需额外的 Broker (Celery 需要 Redis/RabbitMQ 作为 Broker)
2. **内嵌运行**：直接在 FastAPI 进程内运行，减少部署复杂度
3. **asyncio 原生**：APScheduler 4.x 原生支持 asyncio
4. **Render 友好**：单进程部署，不需要额外的 Worker 进程
5. **规模匹配**：MVP 阶段任务数 < 10 个，APScheduler 完全够用

Celery 适合的场景（未来可能迁移）：
- 任务数 > 50 个
- 需要跨机器分发
- 需要任务重试/结果存储/任务链

```python
# 伪代码：APScheduler 配置
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()

# 市场数据缓存刷新 — 每 5 分钟
scheduler.add_job(
    market_cache_refresh,
    IntervalTrigger(minutes=5),
    id="market_cache_refresh",
)

# 相关性矩阵重算 — 每日 02:00 UTC
scheduler.add_job(
    correlation_matrix_rebuild,
    CronTrigger(hour=2, minute=0),
    id="correlation_matrix",
)

# Walrus 定期同步 — 每日 03:00 UTC
scheduler.add_job(
    walrus_daily_sync,
    CronTrigger(hour=3, minute=0),
    id="walrus_daily_sync",
)

# 排行榜更新 — 每 15 分钟
scheduler.add_job(
    leaderboard_update,
    IntervalTrigger(minutes=15),
    id="leaderboard_update",
)

# 休眠熊猫经验衰减 — 每周一 04:00 UTC
scheduler.add_job(
    experience_decay,
    CronTrigger(day_of_week="mon", hour=4),
    id="experience_decay",
)

# 排行榜更新 — 每 15 分钟
scheduler.add_job(
    leaderboard_update,
    IntervalTrigger(minutes=15),
    id="leaderboard_update",
)

# Gas 余额检查 — 每小时
scheduler.add_job(
    gas_balance_check,
    IntervalTrigger(hours=1),
    id="gas_balance_check",
)

# LLM 成本日报 — 每日 23:59 UTC
scheduler.add_job(
    llm_cost_daily_report,
    CronTrigger(hour=23, minute=59),
    id="llm_cost_report",
)

# Actor 清理 — 每 10 分钟
scheduler.add_job(
    actor_manager.housekeeping,
    IntervalTrigger(minutes=10),
    id="actor_housekeeping",
)

# 在 FastAPI startup 事件中启动
@app.on_event("startup")
async def startup():
    scheduler.start()
```

---

## 三、K 线与实时推送（方案甲）

> **MVP**：K 线聚合在 **`market-monitor`**（读 DeepBook PG `order_fills`）→ Redis `market:tick:*` → **DE + CF Hub**。  
> **无**独立 K-line WSS。方案乙见 **`docs/kline-websocket-service.md`**。

### 3.1 数据流

```
order_fills (DeepBook PG, VPS :5433)
    ↓ market-monitor 增量聚合 + 指标
Redis market:tick:{pair}
    ├──► Decision Engine → PandaActor
    └──► WebSocket Hub → 浏览器（market.tick + candle）

DE PUBLISH panda:* → Hub → 浏览器（同一 WSS）
```

### 3.2 前端接入

| 类型 | 路径 |
|------|------|
| 历史 K 线 | REST `GET /candles/{pool}`（monitor 或 Next BFF） |
| 实时 K 线 + 熊猫 | 单 Hub WSS：`subscribe.market` + `subscribe.simulation` |

### 3.3 方案乙（可选）

独立 **`:9009` K-line WSS** — 仅当 Hub Redis 流量或逐笔延迟不满足需求时启用；见 `docs/kline-websocket-service.md`。

---

## 十、部署架构

### 10.1 服务部署图

```
                              Internet
                                 │
                    ┌────────────┼────────────────┐
                    │            │                 │
             ┌──────▼──────┐    │    ┌────────────▼────────────┐
             │   Vercel     │    │    │   Sui Fullnode (testnet) │
             │   ─────────  │    │    │   RPC + WebSocket        │
             │   Next.js 14 │    │    └────────────────────────┘
             │   API Gateway│    │
             │   + Frontend │    │
             │              │    │
             │  Region: auto│    │
             └──────┬───────┘    │
                    │            │
         ┌──────────▼──────────┐ │
         │     Render           │ │
         │     ──────────       │ │
         │  ┌───────────────┐  │ │
         │  │ Python         │  │ │
         │  │ Decision Engine│  │ │
         │  │ FastAPI/Uvicorn│  │ │
         │  │ Port 8000      │──┼─┘   (Sui RPC 调用)
         │  └───────┬───────┘  │
         │          │          │
         │  Region: Oregon     │
         └──────────┼──────────┘
                    │
         ┌──────────┼──────────────────┐
         │          │                   │
    ┌────▼─────┐  ┌▼──────────┐  ┌─────▼──────┐
    │ Supabase │  │Upstash Redis│  │  Walrus    │
    │ ──────── │  │ ────────  │  │  ──────    │
    │PostgreSQL│  │ Pub/Sub   │  │ 去中心化   │
    │          │  │ REST+TCP  │  │ Blob 存储  │
    │ Region:  │  │           │  │            │
    │ US West  │  │ Region:   │  │ Testnet    │
    │          │  │ US West   │  │            │
    └──────────┘  └───────────┘  └────────────┘
```

### 10.2 环境配置

#### 环境变量清单

```bash
# ============================================
# API Gateway (Vercel)
# ============================================
# 认证
JWT_SECRET=<32 字节随机密钥>
JWT_EXPIRY=86400                    # 24 小时

# Decision Engine 连接
DECISION_ENGINE_URL=https://tradingpanda-engine.onrender.com
DECISION_ENGINE_API_KEY=<内部通信密钥>

# Redis（若 Next 直连缓存/限流；否则可省略，由 DE 独占）
REDIS_URL=rediss://default:<password>@<host>:6379

# Upstash REST 仅配置在 Cloudflare Worker（WS Hub），勿提交到 Vercel
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_WS_URL=wss://fullnode.testnet.sui.io:443
PACKAGE_ID=0x<合约包 ID>

# ============================================
# Decision Engine (Render)
# ============================================
# 数据库
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/tradingpanda

# Redis（Upstash 推荐；Python 使用 TLS TCP）
REDIS_URL=rediss://default:<password>@<host>:6379

# LLM
DEEPSEEK_API_KEY=<DeepSeek V3 API 密钥>

# Sui
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_WS_URL=wss://fullnode.testnet.sui.io:443
SUI_ADMIN_PRIVATE_KEY=<管理员钱包私钥，Base64>
PACKAGE_ID=0x<合约包 ID>

# Walrus
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# 服务配置
PORT=8000
LOG_LEVEL=info
MAX_ACTORS=100
MERKLE_BATCH_SIZE=50
```

#### 密钥管理

| 密钥 | 存储位置 | 轮换周期 |
|------|---------|---------|
| JWT_SECRET | Vercel Environment Variables | 90 天 |
| DEEPSEEK_API_KEY | Render Environment Variables | 按需 |
| SUI_ADMIN_PRIVATE_KEY | Render Environment Variables | 不轮换 (testnet) |
| DECISION_ENGINE_API_KEY | 双方环境变量 | 90 天 |
| DATABASE_URL | Render Environment Variables (自动) | 自动 |
| REDIS_URL | Render / Vercel（若 Next 直连缓存） | 按需；`rediss://` |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | **仅** Cloudflare Worker（WS Hub） | 按需 |

### 10.3 扩容策略

#### 当前阶段 (MVP, <100 只熊猫)

```
Render: 1 实例 (1 vCPU, 512MB) — $7/mo
Supabase: Free tier (500MB, 50K rows)
Upstash Redis: Free tier（约 10k cmd/天，以官网为准）
```

#### 增长阶段 (100-1000 只熊猫)

```
Render: 1 实例 (2 vCPU, 2GB) — $25/mo
  - 单实例可承载 ~200 个 Actor (asyncio 并发)
  - 超过 200 时，启动第二个实例 + Redis 分片路由

Supabase: Pro ($25/mo, 8GB, 无限行)
Upstash Redis: Pay-as-you-go（约 $3–15/月，视 cmd 量）
```

#### 规模化阶段 (>1000 只熊猫)

```
Render 水平扩展:
  - 每实例最多 100 个活跃 Actor
  - N = ceil(active_pandas / 100) 个实例
  - Actor 路由: hash(panda_id) % N → 实例编号
  - 通过 Redis Pub/Sub 广播市场数据到所有实例

PostgreSQL 读写分离 (未来):
  - Supabase Pro 内置只读副本
  - 写操作 → 主库
  - 读操作 (排行榜/历史查询) → 只读副本

Redis 集群 (未来):
  - Pub/Sub 频道按 pair 分片
  - 缓存数据按 panda_id 分片
```

---

## 十一、监控与告警

### 11.1 关键指标

| 指标 | 采集方式 | 告警阈值 |
|------|---------|---------|
| 决策引擎延迟 P50 | FastAPI middleware 计时 | >100ms |
| 决策引擎延迟 P95 | FastAPI middleware 计时 | >500ms |
| 决策引擎延迟 P99 | FastAPI middleware 计时 | >1000ms |
| LLM 调用日成本 | CostMonitor 聚合 | >$1/天 (MVP) |
| LLM 调用成功率 | 请求成功/总请求 | <95% |
| LLM 平均延迟 | 请求计时 | >5s |
| 活跃 Actor 数量 | ActorManager.count() | >80 (接近上限) |
| Merkle Root 提交延迟 | pending → confirmed 时间 | >5 分钟 |
| Merkle Root 失败率 | failed / total | >5% |
| WebSocket 连接数 | WS Hub 连接池计数 | >800 (接近上限) |
| PostgreSQL 连接池使用率 | SQLAlchemy pool status | >80% |
| Redis 内存使用 | Redis INFO memory | >80% 配额 |
| 管理员钱包余额 | 定时查询 | <5 SUI |
| API 错误率 (5xx) | HTTP 响应码统计 | >1% |
| Walrus 同步失败 | 同步任务状态 | 任何失败 |

#### 监控实现

```python
# 伪代码：FastAPI 性能中间件
class MetricsMiddleware:
    """收集请求级别指标"""

    async def __call__(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        # 记录到内存指标 (Prometheus 格式)
        self.histogram.observe(
            duration,
            labels={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
            },
        )
        return response
```

**告警通道：**
- MVP 阶段：日志输出 + Render 内置告警 (500 错误邮件通知)
- 正式版：接入 Sentry (错误追踪) + Prometheus + Grafana

---

## 十二、成本估算

### 基础设施成本

| 服务 | Free Tier | MVP 阶段 | 增长阶段 (100只) | 规模化 (1000只) |
|------|----------|---------|----------------|----------------|
| Vercel (前端+API Gateway) | ✅ | $0/mo | $20/mo (Pro) | $20/mo |
| Render (Decision Engine) | — | $7/mo (Starter) | $25/mo (Standard) | $85/mo (Pro×2) |
| Supabase (PostgreSQL) | ✅ | $0/mo | $25/mo (Pro) | $25/mo |
| Upstash Redis | ✅ Free | ~$0/mo | ~$3–15/mo | ~$15–30/mo |
| **基础设施小计** | | **$7/mo** | **$77/mo** | **$160/mo** |

### 运营成本 (引用 cost-model.md)

| 项目 | 单熊猫/天 | 100 只/月 | 1000 只/月 |
|------|---------|---------|----------|
| DeepSeek V3 策略解析 | ~$0.006 | $18 | $180 |
| 决策计算 (本地) | $0 | $0 | $0 |
| Sui Gas (Merkle Root + 经验更新) | — | $96 | $960 |
| **运营小计** | | **$114/mo** | **$1,140/mo** |

### 总成本汇总

| 阶段 | 月总成本 | 单熊猫月成本 |
|------|---------|------------|
| **黑客松 MVP** (1 只) | **$7** | $7.00 |
| **100 只** | **$191** | $1.91 |
| **1,000 只** | **$1,300** | $1.30 |
| **10,000 只** | **$11,260** | $1.13 |

> 注：Sui Gas 占运营成本的 80%+。通过增大 Merkle Root 批次 (50→200) 和合并 dynamic_field 写入，Gas 成本可降低 50-75%。

### 黑客松 MVP 总成本

| 项目 | 成本 |
|------|------|
| 合约部署 | $0.30 |
| NFT 铸造 (1 只) | $0.06 |
| 策略解析 (~20 次 Demo) | $0.02 |
| Merkle Root 提交 (~10 次) | $0.15 |
| Render 服务器 (1 个月) | $7.00 |
| **黑客松总成本** | **~$7.53** |

---

## 附录 A：PostgreSQL 数据模型

```sql
-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    sui_address VARCHAR(66) UNIQUE NOT NULL,
    auth_method VARCHAR(20) NOT NULL,   -- wallet | zklogin
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- 熊猫表
CREATE TABLE pandas (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) UNIQUE NOT NULL,  -- Sui 对象 ID
    owner_address VARCHAR(66) NOT NULL REFERENCES users(sui_address),
    boldness SMALLINT NOT NULL,
    patience SMALLINT NOT NULL,
    intuition SMALLINT NOT NULL,
    focus SMALLINT NOT NULL,
    contrarian SMALLINT NOT NULL,
    talent SMALLINT NOT NULL DEFAULT 0,
    experience_level SMALLINT NOT NULL DEFAULT 0,
    is_trading BOOLEAN DEFAULT FALSE,
    walrus_blob_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 策略表
CREATE TABLE strategies (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL REFERENCES pandas(panda_id),
    raw_text TEXT NOT NULL,
    parsed_json JSONB NOT NULL,
    text_hash VARCHAR(64) NOT NULL,       -- SHA-256(raw_text)
    prompt_version VARCHAR(10) NOT NULL,
    proficiency SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 交易历史表
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    asset VARCHAR(20) NOT NULL,
    action VARCHAR(4) NOT NULL,            -- BUY | SELL
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    pnl DECIMAL(20, 8),
    pnl_pct DECIMAL(8, 4),
    decision_score DECIMAL(5, 4),
    emotion VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_trades_panda ON trades (panda_id, created_at DESC);

-- 形态记忆表
CREATE TABLE pattern_memories (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    pattern_hash VARCHAR(64) NOT NULL,
    win_count INT DEFAULT 0,
    total_count INT DEFAULT 0,
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(panda_id, pattern_hash)
);

-- 资产专精表
CREATE TABLE asset_masteries (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    asset VARCHAR(20) NOT NULL,
    trade_count INT DEFAULT 0,
    win_count INT DEFAULT 0,
    total_pnl DECIMAL(20, 8) DEFAULT 0,
    UNIQUE(panda_id, asset)
);

-- 错误反省表
CREATE TABLE mistake_journals (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    error_type VARCHAR(50) NOT NULL,       -- chase_high | panic_sell | ...
    count INT DEFAULT 1,
    last_occurrence TIMESTAMP DEFAULT NOW(),
    context JSONB
);

-- 周期认知表
CREATE TABLE cycle_wisdoms (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    market_state VARCHAR(20) NOT NULL,     -- bull | bear | sideways
    duration_days INT DEFAULT 0,
    trade_count INT DEFAULT 0,
    avg_pnl DECIMAL(8, 4)
);

-- 熊猫日记表
CREATE TABLE diaries (
    id SERIAL PRIMARY KEY,
    panda_id VARCHAR(66) NOT NULL,
    content TEXT NOT NULL,
    mood VARCHAR(20),
    key_trades JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Merkle Root 记录表 (见第六章)
-- 市场数据缓存表 (见第四章)
```

---

## 附录 B：API 内部通信协议

Decision Engine 提供以下 HTTP REST 端点供 API Gateway 调用：

```
POST /internal/panda/{id}/strategy      # 喂策略
POST /internal/panda/{id}/start         # 开始模拟
POST /internal/panda/{id}/stop          # 停止模拟
POST /internal/panda/{id}/ask           # 向熊猫提问
POST /internal/panda/{id}/fast-forward  # 快进模式
GET  /internal/panda/{id}/state         # 获取 Actor 状态
GET  /internal/health                   # 健康检查
GET  /internal/metrics                  # Prometheus 指标
```

所有内部请求携带 `X-Internal-Key` 头部用于身份验证。

---

## 附录 C：测试策略

详见 `testing-strategy.md`。后端测试覆盖：

**单元测试 (pytest)**：
- 8 步决策管线每步独立测试
- 情绪状态机 7 状态跳转 + 天赋例外
- 策略残影衰减 + 频繁换策惩罚
- 多资产相关性计算 + Lv.3+ 感知条件

**回归测试 (Battle Cases)**：
- 阿暴/阿稳/阿鬼 × BTC 闪崩场景
- 性格×策略匹配度验证
- 每次代码变更必跑

**集成测试**：
- Internal RPC 全链路（策略解析 → 模拟启停 → 状态查询）
- WebSocket 事件推送
- DeepBook 数据拉取 + 降级到本地模拟

**可视化工具** (Streamlit)：
- Pipeline Debugger：单次决策 8 步可视化
- Battle Simulator：三只代表熊猫对比
- Parameter Tuner：公式参数调优

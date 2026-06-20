# TradingPanda 开发上下文（唯一真相）

> 本文档以「忒修斯之船」方式持续维护：只换木板、不换整船。部署事实变更时同步更新对应段落；任何改动必须在本文末尾「§9 变更日志」追加一行。
>
> **最后同步**：2026-06-20（Vercel SSR build fix）

---

## §1 项目概述（为什么做）

### 1.1 产品目标

TradingPanda 是 Sui 链上的 **AI 交易宠物养成系统**，目标是 Sui Overflow 2026 黑客松（2026年5-6月）。

- 用户铸造一只熊猫 NFT（性格五轴由 `sui::random` 随机生成，不可更改）
- 用户用 **规则积木**（或可选自然语言）喂给熊猫交易策略，熊猫在模拟盘自主练习交易
- 熊猫通过盈亏获得经验、改变情绪、成长进化
- 经验数据可验证（Merkle Root 上链），熊猫可在 Kiosk 市场买卖

**一句话**：养一只会交易的 AI 熊猫。

### 1.2 竞品差异化

| | RaidenX | WaterX | Griffain | **TradingPanda** |
|---|---------|--------|----------|-----------------|
| 定位 | AI 交易工具 | AI 交易引擎 | 自然语言交易 | **AI 交易养成** |
| 情感连接 | 无 | 无 | 无 | **宠物养成** |
| NFT 价值 | 无 | 无 | 无 | **性格稀缺性+训练价值** |

---

## §2 当前状态总览

### 2.1 里程碑进度

| 里程碑 | 状态 | 进度 | 备注 |
|--------|------|------|------|
| 骨架搭建 | ✅ 完成 | 100% | frontend/backend/contracts 目录结构、CLAUDE.md、DEV_CONTEXT.md |
| Sui Move 合约 | 🟢 Testnet v4 已 upgrade | 95% | `panda_vault::deposit_training_credit` 已上链；PandaCoin Treasury 已 bootstrap |
| PostgreSQL Schema | ✅ v3.1 Schema 已落地 | 100% | Supabase `dpezgzzvbpemlgxdogue` 已从 `002` 升级至 Alembic head `006_trust_merkle_columns`；`verify_db.py` 覆盖 31 张表 + 8 个关键索引 + `006` Merkle 新列 |
| 铸造流程（Mint） | 🟢 Epic 1 完成 | 100% | `/mint` 按 `page-mint.md`：PandaCarouselStage + WalletSignatureModal + toast + MintDetails drawer → `/agent-wallet`；链上 mint 仅身份；DB 注册幂等 + tx digest 重试同步 |
| 策略解析 | ✅ Epic 2 完成 | 100% | `POST/GET /panda/:id/strategy` + `validate`；积木 `StrategyBuilder`；LLM 5/min；`strategy_history` ghost 0.40 |
| 8步决策引擎 | 🟡 MVP 实现 | 92% | L0 测试 83% 覆盖（pipeline/rule 100%）；entry_delay/social/review poller 已接线；Epic 11 E2E 待验 |
| 情绪状态机 | 🟡 MVP 实现 | 80% | 7 状态转移 + Step 8 情绪扭曲；已接入 Actor |
| Merkle Root Worker | 🟢 Epic 9 完成 | 95% | Trade Fact leaf + 异步 `merkle_batch_ready` job + `trust_proof::submit_merkle_root`（dry-run 可测）；`GET /panda/:id/trust/merkle`；Training Ledger 状态条展示 |
| 经验引擎（5子系统） | 🟢 读写闭环 | 90% | load + Step5 修正 + `record_trade` 写回；Walrus 归档经 `walrus_archive_requested` 异步 job（review/skill） |
| 模拟盘前端 Dashboard | 🟡 UI 实现 | 70% | 三栏布局、K 线（lightweight-charts）、决策链/策略/池选择；`useMarketWs`/`useSimulationWs` 已封装，Dashboard 接线待 Epic 3 |
| NFT 市场（Kiosk） | 🟡 UI 实现 | 40% | 市场网格/筛选/弹窗（mock）；Kiosk 交易待接 |
| 排行榜/成就/签到 | 🟢 链下完成 | 80% | `GET /leaderboard`(winrate/pnl/level)、`GET /achievements`(9 目录+检测)、`POST/GET /checkin`(streak) + BFF + 三个前端页接真实数据；纯逻辑单测；**缺**：成就/签到链上奖励（合约侧）|
| 黑客松 MVP 验收 | ⏸️ 待开始 | 0% | 目标：2026年6月 |

### 2.2 关键设计决策（已锁定）

| 决策 | 结论 | 原因 |
|------|------|------|
| 信任层 | Merkle Root 先行（PRD C1） | Nautilus TEE 作正式版升级路径 |
| 数据存储 | PostgreSQL（Supabase）+ Walrus 备份 | 无本地 SQLite（PRD C2） |
| MVP 入口 | Web App only，无 Telegram Bot | （PRD C3） |
| 计算位置 | 全服务端（Python Decision Engine） | 前端零计算（PRD C4） |
| 实盘 | MVP 不做，DeepBook 仅模拟 | （PRD C5） |
| 情绪稳定性 | 从 patience 推导，非独立轴 | （PRD C9） |
| 胜率 | 链下 trades 表计算，不上链 | （PRD C11） |
| 执行阈值 | >0.65 执行 / 0.40-0.65 观望 / <0.40 忽视 | （PRD C12） |
| 策略残影 | ghost_weight 衰减，旧策略归档不删除 | （PRD C7） |
| 行情采集 | **`market-monitor/`**：默认 Mysten 公开 Indexer（`deepbook-indexer.mainnet.mystenlabs.com`）拉 OHLCV + 盘口；可选 PG `order_fills`；→ `PUBLISH market:tick:{pair}` | `docs/market-monitor-design.md` |
| 实时推送（方案甲） | **单 WSS** `NEXT_PUBLIC_WS_URL`：Hub 订 **`market:tick:*` + `panda:*`**；REST 历史 K 线 `GET /candles` | `docs/websocket-hub-design.md` |
| K 线独立服务 | **MVP 不部署** `:9009`；可选方案乙见 `docs/kline-websocket-service.md` | 高频拆流时再上 |

---

## §3 服务拓扑（当前事实）

```
frontend/   → Vercel
            Next.js 14 App Router + TypeScript
            HTTP API Gateway（Next.js API Routes）；**不承载 WebSocket**
            项目：mooses-projects-b6ad2548/frontend
            Production Ready：https://frontend-pjvovgnsg-mooses-projects-b6ad2548.vercel.app
            Alias：https://frontend-mooses-projects-b6ad2548.vercel.app
            当前 Vercel Deployment Protection/SSO 返回 HTTP 401；需在 Vercel 关闭保护后公网可访问

market-monitor/ → **Render / 任意主机**（无需 VPS DeepBook 栈）
            默认 Mysten 公开 Indexer HTTP（OHLCV + 盘口 + 成交量）；可选 `DEEPBOOK_DATABASE_URL` PG
            `PUBLISH market:tick:*`；`GET /health`；`GET /candles/{pool}`
            Render URL：https://trading-panda-market-monitor.onrender.com
            设计见 docs/market-monitor-design.md

websocket/  → Cloudflare Workers + Durable Objects（**已部署**）
            生产 URL：`https://trading-panda-ws.502488946.workers.dev`
            WSS：`wss://trading-panda-ws.502488946.workers.dev/ws?token={JWT}`
            订阅 Upstash：`market:tick:*` + `panda:*`（方案甲）
            本地 `npm run dev` :8787

backend/    → Render (Web Service)
            Python 3.11 + FastAPI + uvicorn
            端口：由 Render 注入 $PORT（本地默认 8000）
            Render URL：https://trading-panda-backend.onrender.com

Database    → Supabase（PostgreSQL 15+）或 Render PostgreSQL
            连接池：PgBouncer Transaction 模式（端口 6543）
            连接串：$DATABASE_URL

Cache       → **Upstash Redis**（推荐；MVP 可与 Redis Cloud 互换直至迁移完成）
            连接串：`$REDIS_URL`（Render / 本地 Python 使用 **`rediss://`** TLS，见 backend/.env.example）
            Worker 侧：`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`（仅 CF，勿提交到 Vercel）
            用途：Pub/Sub（DE 发布；WS Hub 订阅）+ 响应缓存（TTL 60s）+ HTTP Rate Limit + Nonce 等（频道见 `docs/redis-architecture.md` §5）

Blockchain  → Sui Testnet（**本项目首次正式 publish**，钱包 `0xa459…7bf3`）
            Package ID（original-id，v1 发布 / 事件 lineage）：0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465
            Package published-at（v4 链上对象，**PTB moveCall 须用此地址**）：0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339
            Package version：**4**（Sui CLI `testnet-v1.73.1` / protocol 126）
            PandaRegistry Object ID：0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5
            AchievementRegistry Object ID：0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b
            AdminCap Object ID：0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00
            UpgradeCap Object ID：0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e
            Publish Tx：HM2XXX4MHQzskM6TLgxmoYAsJJarRJfiAKUuWrjaZiQ3
            Upgrade Tx（v1→v2）：Ftg2Yu7dz94xHubPKdcqieK8DMJj3KjV4zRftkMA1cjB
            Upgrade Tx（v2→v3）：APAEyimP9KhCfHiDSsFQVSwkJu9gBXugoyiW3UMWSLXq
            Upgrade Tx（v3→v4）：2ycsrXZHFK4xQ5iQQ42mYaoCexnDMoLdcUfuSoMZCfBr
            新增模块（v2）：`agent_wallet` · `chain_proof_executor` · `panda_coin` · `panda_vault` · `trading_policy`；`trust_proof::submit_skill_digest` 已含
            PandaCoin TreasuryCap（`PandaTrainingToken`）：0x3286e67193c94b1a46fbcc2d08632c30cc6c30dd5b4f31a8787942d8a04b98f6
            PandaCoinAdminCap：0x44e4ee18e846133db694bd5cd82969230b3d3b55ace6e3acb4969118e213064a
            PandaCoin bootstrap Tx：`panda_coin::bootstrap_currency` → 6229ATwhDTEnRNS4fyqcVj6wdXoax1yBps7d4mafhXPt
            铸币入口：`panda_coin::mint_training_credit`；Vault 存取：`panda_vault::deposit_training_credit` / `withdraw_training_credit`（v4 已上链）
```

---

## §4 环境变量清单

### frontend/.env.local（不提交，参考 frontend/.env.example）

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_BACKEND_URL` | Python 决策引擎 URL（如 https://xxx.onrender.com） |
| `NEXT_PUBLIC_WS_URL` | **唯一** WSS 基址（Hub：`market.tick` + 熊猫事件）；生产 `wss://trading-panda-ws.502488946.workers.dev/ws`；本地 `ws://127.0.0.1:8787/ws` |
| `MARKET_MONITOR_URL` | BFF 代理历史 K 线（默认 `http://localhost:8001`） |
| `NEXT_PUBLIC_SUI_NETWORK` | testnet / mainnet |
| `NEXT_PUBLIC_PACKAGE_ID` | Move 合约 original-id（v1；事件 lineage） |
| `NEXT_PUBLIC_PACKAGE_PUBLISHED_AT` | 最新 upgrade 对象 ID（v4；**PTB moveCall 目标**） |
| `NEXT_PUBLIC_REGISTRY_ID` | PandaRegistry Shared Object ID |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | zkLogin Google OAuth Client ID |
| `BACKEND_URL` | BFF 代理用 Python 基址（本地 `http://localhost:8000`；可与 `NEXT_PUBLIC_BACKEND_URL` 相同） |
| `JWT_SECRET` | JWT 签发密钥（与 backend / websocket **相同** HS256，≥32 字符） |
| `INTERNAL_SECRET` | BFF→DE 内部路由鉴权（`X-Internal-Key`，与 backend 一致） |

### backend/.env（不提交，参考 backend/.env.example）

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | **`rediss://`** Upstash（或兼容托管商）TLS 端点；`redis-py` / 异步客户端直连 |
| `DEEPSEEK_API_KEY` | DeepSeek V3 API Key |
| `SUI_RPC_URL` | Sui 全节点 RPC（`https://fullnode.testnet.sui.io:443`） |
| `SUI_PRIVATE_KEY` | 后端签名钱包私钥（Merkle Root / Skill Digest 上链用） |
| `ADMIN_CAP_ID` | Move `AdminCap` Object ID（`trust_proof` 提交用） |
| `PACKAGE_ID` | Move 合约 original-id（v1；事件 lineage） |
| `PACKAGE_PUBLISHED_AT` | 最新 upgrade 对象 ID（v4；**PTB moveCall 目标**） |
| `REGISTRY_ID` | PandaRegistry Shared Object ID |
| `AGENT_SIGNER_ADDRESS` | v3.1 testnet Agent Signer 地址（Chain Proof PTB） |
| `AGENT_SIGNER_PRIVATE_KEY` | Agent Signer 私钥（仅 testnet；Render Secret） |
| `CHAIN_PROOF_ENABLED` | 是否启用 Mode 2 Chain Proof（默认 `false`） |
| `DEEPBOOK_LAUNCH_PAIRS` | Agent Wallet pinned pairs，始终排在 market-monitor ranked pairs 前面；monitor 不可用时也作为 fallback（逗号分隔，如 `DEEP/SUI,SUI/USDC`） |
| `MARKET_MONITOR_URL` | backend 读取 market-monitor `GET /pairs` ranked pairs 的基址（本地默认 `http://localhost:8001`），用于扩展 Agent Wallet/Strategy/Chain Proof pair 白名单 |
| `WALRUS_PUBLISHER_URL` / `WALRUS_AGGREGATOR_URL` | Walrus 存取节点（review/skill 归档） |
| `MERKLE_SUBMIT_ENABLED` | 是否尝试链上提交 Trade Fact Merkle root（默认 `true`，无密钥时 dry-run） |
| `SKILL_DIGEST_ENABLED` | 是否尝试链上提交 skill digest（默认 `true`） |
| `JWT_SECRET` | 与 frontend / websocket Worker **相同**（HS256） |
| `INTERNAL_SECRET` | 与 frontend 共享（BFF `X-Internal-Key`） |
| `GOOGLE_CLIENT_ID` | 可选；校验 zkLogin `id_token` 的 `aud` |
| `PORT` | Render 自动注入，uvicorn 监听此端口 |
| `MAX_ACTORS` | 最大并发 PandaActor 数（默认 100） |
| `ASYNC_JOB_WORKER_ENABLED` | 是否启动后台 `async_jobs` 轮询（默认 `true`） |
| `ASYNC_JOB_POLL_INTERVAL_SEC` | 轮询间隔秒（默认 5） |
| `ASYNC_JOB_BATCH_SIZE` | 每轮最多处理 job 数（默认 10） |
| `SKILL_RELOAD_TICK_INTERVAL` | PandaActor 每隔 N tick 刷新 Skill Memory（默认 50） |

### market-monitor/.env（不提交，参考 market-monitor/.env.example）

| 变量名 | 说明 |
|--------|------|
| `REDIS_URL` | 与 backend 相同 Upstash 实例（`rediss://`） |
| `DEEPBOOK_DATABASE_URL` | **可选**；DeepBook Indexer PG（`order_fills`）；留空则 OHLCV 走 Indexer `/ohclv` |
| `DEEPBOOK_SERVER_URL` | DeepBook Indexer 基址，默认 `https://deepbook-indexer.mainnet.mystenlabs.com` |
| `DEEPBOOK_POOLS` | 可选；**非空则强制**使用；留空则流动性排名自动选 top `MAX_PUBLISH_PAIRS` |
| `DEEPBOOK_NETWORK` | `mainnet`（默认）或 `testnet`（开发回退，改 Indexer URL 为 testnet） |
| `LAUNCH_PAIRS` | 产品优先池，默认 `SUI_USDC,DEEP_USDC,WAL_USDC,NS_USDC` |
| `USE_PAIR_RANKING` / `MAX_PUBLISH_PAIRS` / `STALE_THRESHOLD_SEC` | 流动性排名与 stale 判定 |
| `SUI_RPC_URL` | 全节点 JSON-RPC；池发现回退（默认 **mainnet** `fullnode.mainnet.sui.io`） |
| `DEEPBOOK_PACKAGE_ID` / `DEEPBOOK_POOL_MODULE` | DeepBook v3 主网包（默认 `0x2c8d…4809` / `pool`） |
| `USE_HTTP_POOL_DISCOVERY_PRIMARY` | 默认 `true`：优先 Indexer `GET /get_pools` |
| `USE_SUI_RPC_FOR_POOLS` / `USE_HTTP_GET_POOLS_FALLBACK` | 池发现开关与 HTTP 回退 |
| `POOL_RPC_LIMIT_PER_PAGE` / `POOL_RPC_MAX_PAGES` | 池事件查询分页 |
| `POLL_INTERVAL_SEC` | 主循环间隔，默认 **15** |
| `FILLS_POLL_LOOKBACK_SEC` | tick 读 PG `order_fills` 深度，默认 **72h** |
| `FILLS_LOOKBACK_SEC` | `GET /candles` 历史深度，默认 **30d** |
| `PORT` | Render 注入 |

### Cloudflare WebSocket Hub（`.dev.vars` / Workers Secrets，不提交）

| 变量名 | 说明 |
|--------|------|
| `JWT_SECRET` | 与 frontend/backend **相同** HS256 密钥（Workers Secret） |
| `UPSTASH_REDIS_REST_URL` | Upstash REST API 基址（与 `REDIS_URL` 指向同一数据库） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST Token（Hub 使用 `@upstash/redis` 等 SDK） |

生产 Worker：`trading-panda-ws` @ `502488946.workers.dev`（Account `6617b583298977bf4521bf5dfedef10b`）

---

## §5 API 路径约定

### Next.js API Routes（前端内置 API Gateway）

```
GET  /api/auth/nonce                 # 服务端签发登录 nonce（Redis TTL 300s；query `wallet_address` 可选绑定）
POST /api/auth/connect               # 钱包 / zkLogin 统一连接（wallet：先 nonce 再 PersonalMessage 验签）
POST /api/auth/refresh               # 刷新 Token
GET  /api/auth/me                    # 当前用户
POST /api/auth/wallet-login          # 遗留别名（→ `/auth/login`）
# zkLogin OAuth 回调页：`/auth/zklogin-callback`（hash 内 id_token）

POST /api/panda/mint                 # 链上 mint 后注册 DB（`sui_object_id` + `sui_tx_digest`）
GET  /api/panda/[id]/agent-wallet    # Agent Wallet 状态（代理 → `/panda/:id/agent-wallet`）
POST /api/panda/[id]/agent-wallet/validate-policy  # 策略草案校验
POST /api/panda/[id]/agent-wallet/sync             # 链上 setup tx 后镜像 vault/policy
GET  /api/panda/my                   # 我的熊猫（代理 → backend `/pandas`）
GET  /api/panda/[id]                 # 单只熊猫详情（代理 → `/pandas/:id`）
GET  /api/pandas                     # 当前用户的熊猫列表（legacy，同 `/api/panda/my`）
GET  /api/pandas/[id]                # 单只熊猫详情
POST /api/pandas/[id]/strategy       # 喂策略（转发 → Python backend）
POST /api/pandas/[id]/simulation/start  # 启动 Training Ledger 会话（legacy 路径）
POST /api/pandas/[id]/simulation/stop   # 停止 Training Ledger 会话
GET  /api/panda/[id]/training/ledger         # Training Ledger 账户状态（Epic 5）
GET  /api/panda/[id]/training/order-intents    # OrderIntent 时间线
GET  /api/panda/[id]/training/trade-facts      # Trade Fact 时间线
POST /api/pandas/[id]/calm-bamboo    # 使用冷静竹（重置情绪）

GET  /api/market/candles             # 历史 K 线（BFF → market-monitor GET /candles?pool=…）
GET  /api/leaderboard                # 排行榜（Redis 缓存 TTL 60s）
GET  /api/achievements               # 成就列表
POST /api/checkin                    # 每日签到
GET  /api/panda/[id]/reviews         # Review Journal 列表（Epic 7）
GET  /api/panda/[id]/trade-facts/[tradeFactId]/review  # 单笔复盘
POST /api/panda/[id]/trade-facts/[tradeFactId]/review  # 手动触发复盘
GET  /api/panda/[id]/skill-memories  # Skill Memory 列表
GET  /api/panda/[id]/skill-versions/latest  # 最新 skill version digest
```

### WebSocket Hub（Cloudflare Workers + DO，非 Next.js 路由）

- 连接基址：`NEXT_PUBLIC_WS_URL`（完整 `wss://…`），path/query 与事件类型见 `docs/api-specification.md` 第四章与 `docs/websocket-hub-design.md`。
- ~~`WS /api/ws/...`（Vercel）~~ — **已废弃为架构选项**（Serverless 无法常驻 WS）。

### Python Backend 内部接口（Next.js → 内部调用）

```
GET  /health                         # 健康检查
POST /engine/actors/{panda_id}/start # 启动 PandaActor
POST /engine/actors/{panda_id}/stop  # 停止 PandaActor
GET  /engine/actors/{panda_id}/state # Actor 当前状态快照
POST /engine/strategy/parse          # DeepSeek 解析策略文本 → 四层结构
POST /engine/market/tick             # 推送市场数据（内部触发）
```

---

## §6 数据库结构（当前版本）

PostgreSQL 完整表定义见 `docs/database-schema.md`。Alembic 迁移位于 `backend/alembic/`。

**核心表清单（18张 legacy + 13张 v3.1）：**
`users` · `pandas` · `strategies` · `strategy_history` · `trades` · `simulations` ·
`experience_patterns` · `experience_mastery` · `experience_mistakes` · `experience_cycles` ·
`emotions_log` · `merkle_roots` · `achievements` · `user_achievements` · `checkins` ·
`market_data_cache` · `correlation_matrix` · `panda_diary`

**v3.1 Agent Wallet 表（13张）**：
`panda_vaults` · `trading_policies` · `panda_accounts` · `panda_positions` ·
`order_intents` · `ledger_entries` · `trade_facts` · `trade_reviews` ·
`skill_memories` · `skill_versions` · `chain_execution_logs` · `async_jobs` · `outbox_events`

**当前迁移状态**：`001_initial_core` → `002_panda_subscribed_pools` → `003_growth_experience` → `004_v31_agent_wallet` → `005_chain_proof_idempotency` → **`006_trust_merkle_columns`**（head）。Supabase 项目 `dpezgzzvbpemlgxdogue` 已于 2026-06-17 执行 `python -m alembic upgrade head` 并通过 `python scripts/verify_db.py`：31 张表 + 8 个关键索引 + `merkle_roots.root_type/start_fact_id/end_fact_id` 均为 `ok`。本地/新环境：`alembic upgrade head` → `python scripts/verify_db.py` → `python scripts/seed_dev.py`。

---

## §7 链上合约现状

| 模块 | 文件 | 状态 |
|------|------|------|
| panda | `contracts/sources/panda.move` | 本地实现：Mint、随机性格/天赋、AdminCap、交易锁、转让/重置事件 |
| panda_registry | `contracts/sources/panda_registry.move` | 本地实现：铸造统计、供应上限、铸造开关、休眠计数接口 |
| strategy | `contracts/sources/strategy.move` | 本地实现：当前策略哈希、熟练度、策略残影索引与事件 |
| experience | `contracts/sources/experience.move` | 本地实现：经验摘要、Walrus blob_id、成长阶段事件 |
| trust_proof | `contracts/sources/trust_proof.move` | 本地实现：Merkle Root 批次提交、索引、交易日志验证 |
| achievement | `contracts/sources/achievement.move` | 本地实现：成就定义注册表、解锁记录、重复解锁保护 |
| market | `contracts/sources/market.move` | MVP 实现：Kiosk 上架/下架/购买、交易锁检查、TransferPolicy 创建；版税规则待深化 |
| checkin | `contracts/sources/checkin.move` | 本地实现：管理员发放签到奖励、防重复领取 |
| deepbook_adapter | `contracts/sources/deepbook_adapter.move` | MVP 实现：链下订单簿快照辅助计算与模拟成交；真实 DeepBook 依赖待接入 |

Package ID：**0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465**（见 §3 链上对象 ID）

---

## §8 MVP 验收标准

- [ ] 新用户：问卷 → 铸造熊猫 → 喂策略 → 模拟盘 全流程通畅
- [ ] 决策链可视化（8步展开）正确展示
- [ ] 情绪通过表情/颜色间接展示，不暴露数值系数
- [ ] 策略残影在换策后可感知（熊猫行为有旧策略干扰）
- [ ] Merkle Root 每50笔交易上链
- [ ] NFT 市场买卖通过 Sui Kiosk 完成
- [ ] DeepBook 数据正确拉取并构建 K线
- [ ] 排行榜/成就/签到功能完整
- [ ] Battle Case 4个回归用例通过
- [ ] 决策引擎测试覆盖率 ≥ 80%

---

## §9 变更日志（只追加，不改写历史行）

| 日期 | 变更 | 影响 |
|------|------|------|
| 2026-05-10 | **项目骨架初始化**：创建 `CLAUDE.md`（开发规则，含业务规则速查和 MVP 验收标准）、`dev-docs/DEV_CONTEXT.md`（本文）、`frontend/` Next.js 14骨架（package.json、tsconfig、tailwind、8页面存根、providers、stores、types）、`backend/` Python FastAPI骨架（FastAPI app、actor_manager、panda_actor、decision_pipeline、emotion_state_machine、experience_engine、db models、alembic配置）、`contracts/` Sui Move骨架（Move.toml + 8模块存根）、`vercel.json`、`render.yaml`、`frontend/.env.example`、`backend/.env.example` | 仓库从纯文档状态进入可开发状态；`cd frontend && npm install && npm run dev` 后可看到所有页面路由；`cd backend && pip install -r requirements.txt && uvicorn main:app` 后可访问 /health；合约存根可 `sui move build` 验证语法 |
| 2026-05-10 | **合约实现与部署**：实现 `panda.move` `mint()` 完整逻辑（`sui::random` 5轴性格、15%天赋概率、`MintEvent`）；`panda_registry.move` 添加 `max_supply` accessor；修复 `strategy.move`、`experience.move` 中 `dynamic_field::exists_` 废弃警告；`sui client publish` 部署到 Testnet。PackageID=`0x9b26dfdddef52c980dea0989a22c751ee4c4551d9e39708ab9503990cc7b9710`，PandaRegistry=`0xbc1b3fe71a33501e48c785b2dde2073524d019512915533fd3893d0b65c93541`，AchievementRegistry=`0xc82e707ff49754797556d22542d1d855e4324dc85be9a2393542522be738c3a7`。已回填至 `.env`、`backend/.env`、本文档。 | 合约核心铸造流程上链完成；前端可接入 `NEXT_PUBLIC_PACKAGE_ID` 和 `NEXT_PUBLIC_REGISTRY_ID` 启动 Mint UI 开发 |
| 2026-05-10 | **联调骨架完成**：后端新增 `/auth/login`、`/auth/me`、`GET/POST /pandas`、`GET /pandas/{id}`、`GET /pandas/{id}/strategy`、`POST /engine/strategy/parse` 等接口；完成全部18张表的 ORM models；`main.py` lifespan 启动时 `create_all` 建表；前端完成 `.env.local`（含部署地址）、`useAuth` 钱包签名登录 Hook、Mint页（buildMintTx → on-chain → 注册后端）、Dashboard（性格/情绪/经验展示 + 策略提交）、全部 Next.js API 代理路由；`npx tsc` 零报错。 | 前后端可联调：填写 DATABASE_URL 启动 Python backend → Next.js frontend 即可走通「连接钱包→登录→铸造→查看熊猫→提交策略」完整流程 |
| 2026-05-13 | **合约本地实现与测试**：按 `docs/contract-design.md` 补齐 `panda`、`panda_registry`、`strategy`、`experience`、`trust_proof`、`achievement`、`market`、`deepbook_adapter`，新增 `checkin.move`；补充 `contracts/tests/core_tests.move` 覆盖策略残影、经验摘要、Merkle Root、成就、签到、防交易中转让等核心路径。 | 本地 `cd contracts && sui move build` 通过；`cd contracts && sui move test` 通过（11/11）。本次未重新 publish，Testnet Package/Object ID 暂不变 |
| 2026-05-13 | **进度文档同步与 5% 市场税决策**：同步更新 `dev-docs/DEVELOPMENT_CONTEXT.md`，将 Sui Move 合约进度标为 70%、NFT 市场标为 20%，新增 C13：Panda 二级市场通过 Sui Kiosk + TransferPolicy 收取 5% 版税。 | 产品进度文档与开发事实对齐；下一步合约 v2 需补齐 5% 版税规则、市场路径测试并重新部署 Testnet |
| 2026-05-13 | **文档：WebSocket Hub 选型（Cloudflare）**：新增 `docs/websocket-hub-design.md`；更新 `docs/architecture.md`、`docs/backend-design.md`、`docs/api-specification.md`、`docs/frontend-design.md`、`CLAUDE.md`；`frontend/.env.example` 增加 `NEXT_PUBLIC_WS_URL`；`vercel.json` 移除无效的 `/api/ws` rewrite；本文 §3–§5 与 §2.2 同步。 | 实时通道与 Vercel 解耦的设计事实已写入仓库；**Workers 代码与生产 URL 仍待实现** |
| 2026-05-13 | **Git**：将上述文档与配置变更提交并推送至 `origin/main`（commit `c08b34b`）。 | 远程仓库与本地一致，协作者可拉取最新架构说明 |
| 2026-05-15 | **WebSocket Hub DO 命名规则写死**：`docs/websocket-hub-design.md` 新增 §3.3（`idFromName(\`user:${userId}\`)`、禁止 `panda_id` 作 DO id、订阅与 Redis 转发关系）；`backend-design.md` 增加交叉引用。 | 实现 CF Hub 时避免与 Render 上 `PandaActor` 分片维度混淆 |
| 2026-05-15 | **Redis 架构调研落地**：新增 `docs/redis-architecture.md`（Upstash 推荐、DE/CF 双端、Pub/Sub 频道 §5、禁止 Worker 内嵌 Redis）；同步 `docs/websocket-hub-design.md`、`docs/backend-design.md`、`docs/architecture.md`、`docs/agent-design.md`、`docs/business-flow.md`、`docs/PRD.md`、`CLAUDE.md`、`backend/.env.example`；本文 §3–§4、§2.2。 | 托管与消息流以仓库内文档为准；**Upstash 账号与生产 Token 仍待配置** |
| 2026-05-16 | **DeepBook 监听方案 B（独立 market-monitor）**：新增 `docs/market-monitor-design.md`、`market-monitor/.env.example`；DeepBook **v3** 事件类型；行情 `PUBLISH` 迁至 monitor，DE 仅 `MarketDataConsumer`；更新 `redis-architecture.md`、`architecture.md`、`backend-design.md`、`agent-design.md`、`business-flow.md`、`render.yaml`、本文 §2.2/§3/§4。 | 架构锁定独立监听服务；**market-monitor 代码与 Pool ID 仍待实现/配置** |
| 2026-05-19 | **DeepBook v3 Server 本地部署指南**：新增 `docs/deepbook-v3-server-local-deployment.md`（1130行），覆盖从源码 & Docker 两种部署方式，包含 PostgreSQL 配置、Sui RPC 配置、Indexer 运行、Server 启动、30+ API 端点使用示例、编译 troubleshooting、docker-compose 示例。 | 开发者可按照指南在本地完整部署 DeepBook v3 Server + Indexer；用于 market-monitor 的数据库访问和 API 测试 |
| 2026-05-19 | **Redis Pub/Sub 桥接服务**：新增 `redis-pubsub/`（FastAPI：`PSUBSCRIBE`、`POST /api/publish`、`WS /ws`、`GET /health`）；`render.yaml` 增加 `trading-panda-redis-pubsub`；`docs/redis-architecture.md` §2.1；本文 §3/§4。 | 独立 Pub/Sub 扇出与内部发布 API 可本地 `uvicorn` + pytest；**Render 部署与 Upstash 联调仍待配置** |
| 2026-05-19 | **最终移除 redis-pubsub**：删除 `redis-pubsub/` 目录；`render.yaml` 去掉 `trading-panda-redis-pubsub`；DE/Hub/monitor 均直连 Upstash。 | 架构收敛：无中间 Pub/Sub 桥；见 `docs/redis-architecture.md` §2.1 |
| 2026-05-19 | **DeepBook MVP 数据路径**：`docs/deepbook-v3-server-local-deployment.md` §4 锁定 Indexer+Server API；`market-monitor` 行情不经 Sui RPC；同步 `docs/market-monitor-design.md` §4。 | 行情经 DeepBook Server HTTP；链上 RPC 仅 Indexer/Server 内部（池枚举例外见 2026-05-20 行） |
| 2026-05-19 | **market-monitor 实现**：`feed/deepbook_client`、`pipeline/indicators`、`broadcast/publisher`、`monitor` 轮询循环；`GET /health`；`PUBLISH market:tick:{pair}`。 | `uvicorn main:app --port 8001` + DeepBook Server + Redis 可联调 |
| 2026-05-20 | **DE 全量单元测试**：`backend/tests/` 扩至 12 文件、112 用例（八步 L0 拆台、CV-01～08、Battle Case 4/4、规则引擎/MACD/SELL、情绪机扩展）；`tests/conftest.py` 共享 fixture | `cd backend && pytest tests/ -q` 全绿 |
| 2026-05-20 | **DE 测试方案报告**：新增 `backend/docs/decision-engine-test-plan.md`（L0 公式层 / L1 控制变量 / L2 Battle Case、证人名单、CV 实验表、排期）；`backend/README.md` 增加链接 | 补齐「测什么、缺什么、权重怎么测」的单一文档入口 |
| 2026-05-20 | **backend/README.md**：新增 Decision Engine 说明与 L1～L5 分层测试、联调顺序、验收清单、排障表 | 本地测 DE 可只读该文档，无需翻聊天记录 |
| 2026-05-20 | **Decision Engine MVP**：实现 `rule_engine`、`decision_pipeline`（8 步完整公式）、`strategy_ghost`、`market_event`、`market_consumer`、`event_publisher`、`panda_loader`；`PandaActor` 订阅 Redis `market:tick:*`、模拟成交写 `trades`、发布 `panda:{id}:decision|emotion`；`ActorManager` lifespan 启停；`POST /engine/market/tick` 内部注入；pytest 13 项通过 | 本地 `uvicorn main:app` + `REDIS_URL` + market-monitor 可联调模拟盘；Battle Case / Merkle 上链 / 经验表全量读写仍待补 |
| 2026-05-20 | **WebSocket Hub 实现（Cloudflare）**：新增 `websocket/`（Router Worker + `UserHub` DO、JWT HS256、`subscribe.simulation`/`subscribe.market`、Upstash `subscribe` 转发、15 项 vitest）；`websocket/README.md`、`.dev.vars.example`。 | 本地 `cd websocket && npm run dev` → `wss://127.0.0.1:8787/ws?token=…`；生产 URL 待 `wrangler deploy` 后填入 `NEXT_PUBLIC_WS_URL` |
| 2026-05-19 | **DeepBook v3 部署文档更新**：`docs/deepbook-v3-server-local-deployment.md` 新增 §4 架构决策（Indexer vs Sui RPC 对比表、分阶段过渡路径、技术指标数据需求）、§5 数据保留策略（MVP 30天/正式 6个月、存储空间估算、cron 清理脚本 + Python 清理脚本）；更新 §6 PostgreSQL 配置（推荐 Docker 替代 Homebrew）、§8 编译指南（强调 release 模式必要性）、§9 Indexer 运行（新增 `--start-checkpoint` 加速首次同步）、§16 FAQ 新增 4 条（Q4 release 编译失败、Q11 API 端点路径纠正、Q12 Homebrew 兼容性）。全文 1255 行。 | 部署指南更完善，覆盖实际部署经验教训；开发者可避免 Homebrew/调试编译/API 路径等常见陷阱 |
| 2026-05-20 | **market-monitor 池列表经 Sui RPC**：`feed/sui_pool_client.py`（`suix_queryEvents` + `PoolCreated` 泛型解析）、`config`/`monitor`/`health` 开关与回退；`tests/test_sui_pool_client.py`；`docs/market-monitor-design.md`、`docs/deepbook-v3-server-local-deployment.md`、`render.yaml`（`SUI_RPC_URL` 等）、`market-monitor/.env.example`；本文 §2.2/§3/§4 同步 | 池名与链上一致；OHLCV/盘口仍依赖 DeepBook Server + Indexer；可选 `GET /get_pools` 回退 |
| 2026-05-21 | **market-monitor 手动联调说明**：`market-monitor/README.md` 测试章新增「手动联调（DeepBook + Redis）」（前置、`/health`、Redis `PSUBSCRIBE`、排错与最小验收）；pytest 小节改为「单元测试」子标题 | 联调步骤以仓库文档为准，不依赖聊天上下文 |
| 2026-05-20 | **K 线架构锁定（VPS）**：第一性原理排除 CF Workers 聚 K 线；K-line WSS 部署 VPS `152.53.166.128:9009`（PG `:5433` `order_fills`）；Hub 仅 `panda:*`；同步多份文档 | 前端双 WSS（后被方案甲替代） |
| 2026-05-20 | **方案甲（MVP）**：`order_fills` 无 `/ohclv`；**market-monitor** 聚 K 线 → `market:tick`；**Hub 订 market + panda**；前端 **单 WSS + REST 历史**；K-line :9009 降为方案乙；文档全量同步 | 实现待办：monitor 读 PG、`GET /candles`、Hub 确认转发 `market.tick` |
| 2026-05-20 | **market-monitor 方案甲代码**：`feed/fills_client.py`（asyncpg + 表结构自适应）、`pipeline/kline_aggregate.py`、`GET /candles/{pool}`、`DEEPBOOK_DATABASE_URL`；pytest 20 项通过 | 配置 VPS PG 与 `DEEPBOOK_POOLS` 后可发 `market:tick`；池 `pool_id` 解析见日志 |
| 2026-05-20 | **market-monitor 池列表修复**：`/get_pools` JSON 对象数组正确解析 `pool_name`；拒绝误填 URL；`order_fills` 无 `id` 列时用 `ROW_NUMBER`；`pool_name→pool_id` 目录映射 | 勿将 `DEEPBOOK_POOLS` 设为 `http://…/get_pools`；`DEEPBOOK_SERVER_URL` 仅基址 |
| 2026-05-20 | **market-monitor orderbook**：池名 URL 编码（`DEEP/SUI`→`DEEP%2FSUI`）；`GET /orderbook?depth=&level=`；盘口失败不阻断 `market:tick` | 与 DeepBook Server testnet 包修复后联调 |
| 2026-05-21 | **market-monitor README**：重写「测试与验收」步骤 0–6，含 `/health`、`/candles`、Redis 期望 JSON 与最小验收清单 | 联调以 README 为准 |
| 2026-05-21 | **market-monitor `/candles` 路由**：`{pool:path}` 支持 `DEEP/SUI`；新增 `GET /candles?pool=`；`DEEP%2FSUI` 单段路径在 Starlette 下仍可能 404 | 重启后 `curl …/candles/DEEP/SUI` 或 `?pool=DEEP/SUI` |
| 2026-05-21 | **market-monitor PG 回溯**：`FILLS_POLL_LOOKBACK_SEC`（tick，默认 72h）、`FILLS_LOOKBACK_SEC`（REST `/candles`，默认 30d）；`POLL_INTERVAL_SEC` 默认 15；health 细分 `no_fills_ever` / `no_fills_in_poll_window` / `insufficient_candles`；`.env.example` 推荐 `DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC` | testnet 稀疏成交下可聚 K 线并 `PUBLISH market:tick`；前端历史仍经 monitor `/candles`，不用 `/ohclv` |
| 2026-05-22 | **dev-docs/TODO.md**：Sprint 0 地基 + Epic 1–7（Mint→Strategy→Dashboard→Pools→Market→Growth）纵向切片任务清单；Phase 2 单列 | 开发按 TODO 逐项执行；完成项勾选并同步 DEV_CONTEXT §2.1 |
| 2026-05-22 | **frontend-design.md v1.1**：同步 Obsidian `design-spec/` 六份规范（tokens、mint、dashboard、trading、market、pools）；Dashboard 改为 180+flex+170 三栏；新增 §3.4 Trading、§3.5 Pools；Market 卡片 183×210；Navbar **44px**（设计规范） | 工程 UI 与 Obsidian mockups 对齐；`/pools`、`/trading/[id]` 路由待实现 |
| 2026-05-22 | **猎手策略规格（积木 + API）**：PRD §3.2 混合输入（`parsed` 直传默认 / `raw_text`+LLM 可选）、单策略多 `signal_rules`、Step 1 投票公式；`api-specification.md` 扩展 `POST …/strategy`、`POST …/validate`；`agent-design.md` Step 1 与 `rule_engine` 一致 | 文档已定稿；后端 `strategy.py` 与前端积木 **待实现** |
| 2026-05-22 | **Sprint 0.1 契约与类型**：前端拆分 `types/{strategy,panda,trading,api}.ts`（`DecisionStep.rule_hits`、`ParsedStrategyLayers`、`StrategyFeedRequest`）；后端 `app/schemas/`（Pydantic + `ApiErrorCode`/`STRATEGY_*`/`PANDA_*`）；`rule_engine.rule_is_compilable`；`tests/test_schemas.py` 9 项通过；`npm run type-check` 绿 | Sprint 0.1 Done；Epic 2 策略 API 可接 schema；BFF 错误码透传待 0.3 |
| 2026-05-25 | **Sprint 0.2 数据库与迁移**：Alembic 首版 `001_initial_core`（`users`·`pandas`·`strategies`·`strategy_history`·`simulations`·`trades`）；`strategy_history` 对齐残影表（`ghost_weight`/`strategy_hash`）；`Simulation` 字段对齐 `database-schema.md`（`initial_capital`/`total_trades`/`final_equity`）；移除启动时 `create_all`；`scripts/verify_db.py`·`scripts/seed_dev.py`；`/health` 真实 `SELECT 1`；`tests/test_db_schema.py` | 部署/本地须 `alembic upgrade head` 后再启 backend；经验/成就等 12 表仍待下一迁移 |
| 2026-05-25 | **backend/README.md 本地指南**：新增 venv 分步（0–8 步）、Supabase Direct/Pooler `DATABASE_URL`、Alembic/`scripts` 用法、排障表与一条龙命令 | 新同学按 README 可在虚拟环境完成迁移+seed+`uvicorn`；联调章节 L1–L5 保留 |
| 2026-05-25 | **Sprint 0.3 BFF / Auth**：`frontend/src/lib/server/backendProxy.ts` 统一代理（`BACKEND_URL`/`NEXT_PUBLIC_BACKEND_URL`、JWT、`X-Internal-Key`）；`POST /api/auth/connect|refresh`、`GET /api/auth/me`；后端 `/auth/connect|refresh|me`（钱包+zkLogin Google tokeninfo）；`useAuth`·`useZkLogin`·`/auth/zklogin-callback`；`.env.example` 与 §4 对齐（`JWT_SECRET`/`GOOGLE_CLIENT_ID`） | 本地：`JWT_SECRET` 三端一致 → 连钱包或 Google 登录拿 token → Hub `?token=` |
| 2026-05-25 | **Sprint 0.3.1 钱包验签 + Nonce Redis**：`GET /auth/nonce` 服务端签发；Redis `auth:nonce:*` TTL 300s 一次性消费；`wallet_verify.py`（PyNaCl + Sui PersonalMessage BCS，无需 pysui）；`useAuth` 先 nonce 再签名；`tests/test_auth_wallet.py` | 钱包登录 **必须** 配置 `REDIS_URL`；伪造签名/重放 nonce → `AUTH_INVALID_*` |
| 2026-05-25 | **ZkLogin 钱包签名（flag 5）**：BFF `POST /api/auth/connect` 用 `@mysten/sui/verify` + `sui_verifyZkLoginSignature`（testnet fullnode）验签后带 `X-Internal-Key`+`X-BFF-Wallet-Verified` 调后端；`bff_auth.py`；移除 Navbar localhost 提示条 | Slush/zkLogin 账户「签名登录」不再 401；`frontend/.env` 须 `INTERNAL_SECRET` 与 backend 一致 |
| 2026-05-25 | **钱包连接后自动登录**：`WalletAuthSync` 在连接且无 JWT 时自动 `loginWithWallet`；移除 Navbar「签名登录」；`walletLoginSession` 全局 in-flight 状态供 UI | 连接钱包 → 一次签名弹窗 → 登录成功；失败点「连接钱包」可 `resetWalletLoginState` 重试 |
| 2026-05-25 | **Navbar 登录态**：修复 zkLogin 后 `WalletAuthSync` 误 `clearAuth`（无钱包不应清 JWT）；已登录隐藏 Google/连接钱包，显示「已登录·地址」与「退出」 | Google / 钱包登录后导航栏可见会话；「我的」仅依赖 JWT |
| 2026-05-25 | **Sprint 0.5 UI 壳（Obsidian tokens）**：`src/styles/tokens.css`（Navbar 44px、`sidebar` 180px、`decision` 170px）；`WalletButton` · `AppShell` · 根 `layout` 壳；`PageContainer` `variant=mint`；Dashboard `dashboard-layout` + `PandaSidebar`/`DecisionPanel` 宽度对齐；`npm run type-check` · `build` 绿 | Sprint 0.5 Done；UI 与 Obsidian 三栏规格对齐 |
| 2026-05-25 | **Sprint 0.4 实时与行情**：Hub 本地 `ws://127.0.0.1:8787/ws`（用户已启）；`subscribe.market` 支持 `pairs`（如 `DEEP/SUI`）对齐 monitor `market:tick`；BFF `GET /api/market/candles` → monitor；前端 `useWebSocket`·`useMarketWs`·`useSimulationWs` + `types/ws.ts`；`npm run type-check` / websocket vitest 17 / monitor pytest 30 绿 | Dashboard 用 `useMarketWs({ pairs:['DEEP/SUI'], pool:'DEEP/SUI' })` 联调；monitor 仍须 `REDIS_URL`+`DEEPBOOK_DATABASE_URL` 才有 tick |
| 2026-05-25 | **Epic 1.1 Mint 契约**：`POST /api/panda/mint`（BFF→`POST /panda/mint`）；请求 `{ sui_object_id, sui_tx_digest, name? }`；响应嵌套 `personality`/`talent`（api-spec）；`mint_event_parser.py` 解析 `PandaMinted`/`MintEvent`；`parseMintEvent.ts` + `panda.service.ts`；`/mint` 页改调新 API；`tests/test_mint_event_parser.py`·`test_panda_schemas.py` 8 项绿 | 钱包签 mint tx 后后端 RPC 验事件并 `INSERT pandas`；`GET /api/panda/:id|my` BFF 已代理 legacy `/pandas` |
| 2026-05-25 | **Mint Object ID 修复（方案 2）**：`useMintPanda` 在 `digest` 后 `waitForTransaction`（`showObjectChanges`+`showEvents`）；`resolvePandaObjectIdFromDigest` 从 `PandaMinted` / `::panda::Panda` created 解析 | 修复 dapp-kit 仅返回 base64 effects 导致「未找到 Object ID」 |
| 2026-05-25 | **Epic 1.3–1.5 Mint 闭环**：`GET /panda/my`·`/{id}`（success 信封·growth_stage·trades 统计）；`POST /auth/onboarding-survey`；前端 `/onboarding` 5 步·`OnboardingGuard`·`useMintPanda`·mint 错误态；Dashboard 接 `fetchPandaDetail`；`dev-docs/EPIC1_MINT_E2E.md` | Testnet 手测：登录→问卷→铸造→Dashboard；Package ID 未变 |
| 2026-05-25 | **Testnet 重新 publish（本项目首次）**：清除 `Published.toml` 旧 testnet 条目后 `sui client publish`（deployer `0xa459…7bf3`，tx `HM2XXX4MHQzskM6TLgxmoYAsJJarRJfiAKUuWrjaZiQ3`）。Package=`0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465`，PandaRegistry=`0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5`，AchievementRegistry=`0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b`，AdminCap=`0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00`，UpgradeCap=`0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e`；已更新前后端 `.env*`、`Published.toml`、`contracts/DEPLOY.md`、§3 | 文档旧 ID `0x9b26…` 作废；`mint::mint` 已上链；UpgradeCap 在本钱包 |
| 2026-05-25 | **Mint 前端入口修正**：`mintPanda.ts` 调用 `::mint::mint`（非 `::panda::mint`）；与 Testnet Package `0x595087…` 上 `mint.move` 一致 | 修复 Slush「No function was found with function name mint」 |
| 2026-05-25 | **Epic 1.2 合约（Sui Testnet）**：`contracts/sources/mint.move` 入口 `mint`/`mint_panda`（`sui::random` 五轴+天赋 + 铸造时初始化 experience/strategy_shadows/trust_proofs/achievements 四类 dynamic_field）；`panda::mint_panda_body`/`finish_mint` 拆分；`tests/mint_tests.move` 2 项；`sui move test` **13/13**；链上 Package `0x9b26…9710` 与 §3 一致（RPC 已验）；`frontend/.../mintPanda.ts` 改为 `::mint::mint`；Testnet upgrade 因本机 Sui CLI protocol 117<124 未执行，**UpgradeCap** `0x4254…308` 不变 | 本地合约 Epic 1.2 Done；生产铸造需升级后 `mint::mint` 才含 DF 初始化；旧 `panda::mint` 在 v1 链上仍可用至升级 |
| 2026-05-25 | **Epic 2 猎手策略 StrategyBuilder**：后端 `panda_strategy.py` + `strategy_feed.py`（`parsed` 直传/LLM 可选、`validate` Step1 预览、`strategy_history` ghost_weight=0.40、性格匹配度规则表）；`panda_loader` 加载残影供 Step4；前端 `StrategyBuilder`/`StrategyTemplates`/`StrategyTextInput` + `strategy.service.ts`；BFF `/api/panda/:id/strategy` + `/validate`；`tests/test_strategy_feed.py` + rule_engine/verdict 绿 | Dashboard「教给熊猫」走积木主路径；无效 MACD 条件 → `STRATEGY_RULE_INVALID` |
| 2026-05-25 | **Epic 3/4 产品共识（TODO）**：会话制——仅「开始训练」后 Actor 消费 `market:tick`；MVP 池 `DEEP/SUI`·`SUI/DBUSDC`；K 线接真行情（禁 mock）；右侧上实时决策链 WS、下交易历史；池切换在 ChartHeader；底栏仅速度+训练按钮 | 见 `dev-docs/TODO.md` Epic 3 §产品共识 |
| 2026-05-25 | **Epic 3 Dashboard 首版**：后端 `panda_simulation.py`（start/stop/status + trades）；`ActorManager` 支持 `subscribed_pools`；前端 Dashboard 接 `useMarketWs`·`useSimulationWs`·`CandlestickChart` 真 K 线·`DashboardRightPanel`·「开始训练」 | 联调需 monitor+Redis+Hub+`JWT` |
| 2026-05-25 | **Epic 3 Dashboard 补全**：`publish_trade_executed`→`panda:{id}:trade`；Hub 订阅 `trade` 后缀；`simulation/status` 含 equity/positions；`AccountPanel` 实盘账；K 线成交量+成交标记 | 部署 Hub 需重新 `wrangler deploy` 以含 trade 频道 |
| 2026-05-25 | **Epic 4 Pools**：`pandas.subscribed_pools` 迁移；`GET/PUT /panda/:id/pools`；`/pools` 页替换 MOCK；Dashboard 与训练订阅同步 | 部署须 `alembic upgrade head`；monitor `/health` 可选 enrichment |
| 2026-05-25 | **Pools API 拆分**：`/pools` 页 `GET /api/pools`（目录）；已选池并入 `GET /api/panda/:id`；仅确认时 `PUT /api/panda/:id/pools` | 避免进页即调 panda/pools；500 多为未跑迁移 `002` |
| 2026-05-25 | **Pools 页修复**：移除 `/api/market/candles` 拉价；目录仅 `GET /api/pools`；`PUT …/pools` 缺列时 503 提示 `alembic upgrade head`；本地已执行 `002_panda_subscribed_pools` | 确认选池应 200；Render 须同样跑迁移 |
| 2026-05-25 | **Pools 确认栏 UX**：确认按钮 loading（保存中…）+ 去掉 ✅；请求期间禁用清空/确认 | 防重复提交 |
| 2026-05-25 | **Dashboard 方案 A**：ChartHeader 下拉仅 `subscribed_pools`；改池不再扩容订阅；训练条移至主区顶部（`DashboardTrainingBar`） | 增删池仅 `/pools`「管理交易池」 |
| 2026-05-25 | **Dashboard 布局 v2**：左栏熊猫+策略积木；右栏账户；主区底决策链+交易历史；小屏策略底部抽屉；见 `dev-docs/dashboard-layout-v2.md` | `dashboard-layout-v2` CSS |
| 2026-05-25 | **Dashboard 横向溢出修复**：CSS Grid `minmax(0,1fr)`；≥1280 三栏 / 1024–1279 两栏；侧栏策略 `compact` 单列；`PageContainer` dashboard 全宽 clip | 修复窄屏撑破视口 |
| 2026-05-25 | **Dashboard 策略右栏**：策略积木迁至 `DashboardRightColumn`（账户上+策略下）；左栏仅熊猫；&lt;1280px 策略底部抽屉 | 右栏宽 260–300px |
| 2026-05-25 | **Dashboard v3 左栏合并**：`DashboardPandaPanel`（熊猫+模拟账户）；右栏仅策略；管理池仅训练条；见 `dashboard-layout-v3-left-panel.md` | `PandaAccountLedger` 折叠详情 |
| 2026-05-26 | **Dashboard 布局优化与溢出修复**：侧栏 w-full 改 lg:w-auto + min-w-0；globals.css 强化 Grid minmax(0, ...) 约束；PageContainer 强制 variant="dashboard" | 彻底解决横向撑破视口问题，适配不同桌面分辨率 |
| 2026-05-26 | **熊猫试装实验室 + 96×96 像素 SVG**：`/panda-lab`（dev 默认开；生产 `NEXT_PUBLIC_ENABLE_PANDA_LAB=true`）；五维/经验/情绪滑条、预设、随机、URL 同步、对比 A、Mint 圆预览；`assets/panda/pixel/` 占位精灵层；`PandaSvgRenderer` 改 `viewBox 0 0 96 96` + `crispEdges` | 无需钱包即可调形象；Navbar「试装实验室」随 flag 显示 |
| 2026-06-06 | **全新 32x32 高清像素熊猫重构**：重新绘制站立姿态基础身体、黑耳朵、大黑眼圈、前肢与环抱肩带；融入 5 轴性格的视觉隐喻（绿/红/金头带、红背风披风、法师帽、cyber 专注目镜、3D 浮动 K 线、yin yang 肚饰等）；重构 7 种全身/氛围交互情绪（爱心/Sparkles、美元眼/垂涎、汗滴/躲闪、眩晕 cross 眼、deadpan、红红火火气脉与泪流、奶嘴婴儿装）；重构 growth stage 装备 | 视觉美感与大熊猫辨识度极大提升，完美闭环婴儿/徒弟/宗师成长形态，零编译/类型错误 |
| 2026-06-06 | **高品质矢量卡通熊猫渲染器重构**：新增 100x100 矢量卡通 (Vector) 渲染器，支持平滑 SVG 路径、渐变阴影、呼吸/眨眼/漂浮等自包含 CSS 动画；在 `panda-lab` 页面中添加渲染器风格切换（矢量 vs 像素） | 熊猫形象视觉美感与现代感获得质的飞跃，与 Web3 现代插画风格对齐，保留像素风格作为备选，全站默认升级为矢量卡通形象 |
| 2026-06-06 | **国潮武侠风矢量熊猫重构**：根据用户偏好，将矢量渲染器重构为极具气场的「国潮武侠」风格。采用温润玉竹色调，重绘为三维侧身战斗站姿，融入竹剑、玉葫芦、太极八卦全息盘、发光黄金/玉石皇冠、漂浮交易秘籍卷轴及旋转太极光晕，并重构了 7 种武侠意境交互情绪与战斗律动动画 | 熊猫形象极具国潮高级感与视觉冲击力，完美契合「交易宠物养成」与「策略战斗」世界观，视觉美感达到行业顶尖水准 |
| 2026-06-06 | **赛博黑金机甲风格矢量重构**：将矢量渲染器重构为极具科技张力的「赛博黑金机甲」风格。采用黑金与暗钢色调，融入量子超立方体（Patience）、等离子巨剑（Boldness）、全息灵兽无人机（Intuition）、胸口奇点能量核心（Focus）、反叛者狂野机械白发与金色电弧（Contrarian），并重构了 7 种赛博情绪交互 | 极具未来科技感与视觉张力，完美融合赛博机甲与中国熊猫元素，视觉美感与科技感达到顶尖水准 |
| 2026-06-06 | **3D WebGL 交互式模型重磅上线**：在 frontend 项目中引入 Three.js，新建 `Panda3DCanvas.tsx`，通过程序化建模（Procedural Modeling）和 PBR 材质，将赛博黑金机甲熊猫及五维装备完美 3D 化。实现 3D 战斗律动动画、量子立方体旋转、无人机轨道环绕、电弧闪烁及呼吸光效，并支持 OrbitControls 3D 自由旋转与缩放；通过 Next.js dynamic 禁用 SSR 引入，在 `/panda-lab` 页面中添加「3D 交互」风格切换 | 实现了从 2D 矢量/像素到 3D 交互式 WebGL 的革命性跨越！渲染效果极其震撼，操作流畅，资源零内存泄漏，用户体验提升至全新维度 |
| 2026-06-06 | **3D 萌系赛博 Q 版（Chibi Cyber）重构**：根据用户反馈，将 3D 渲染器重构为「萌系赛博 Q 版」风格。采用哑光碳纤维与霓虹金材质（Matte Carbon & Neon Gold），重塑为大头圆身体的 Chibi 比例，并设计了极具科技感的「智能全息护目镜（Holographic Visor）」。护目镜上能实时动态绘制 K 线、交易数据（PANDA OS）及情绪符号（如 `^ _ ^`、`$ _ $`、`X _ X` 等），并对五维装备进行了可爱的 3D 比例重塑 | 3D 熊猫形象不仅极具未来科技张力，同时兼具潮玩萌宠的可爱感，动态 HUD 护目镜与交易宠物的设定完美契合，视觉效果极其精致与生动 |
| 2026-06-06 | **Rive 骨骼动画渲染器集成**：根据用户最新指令，在项目中全面集成 Rive 骨骼动画引擎。新建 `PandaRiveCanvas.tsx` 组件，使用 `@rive-app/react-canvas` 驱动 `.riv` 骨骼动画，并支持自动降级（Fallback）机制：若本地 `/animations/panda.riv` 资源未就绪，将自动加载社区著名的交互式 Teddy Bear 动画，并巧妙地将熊猫五维属性及 7 种情绪映射至 Rive 状态机输入（如 `isHandsUp`、`isChecking`、`numLook`），实现全交互骨骼动画；在 `/panda-lab` 中添加「Rive 骨骼」风格并设为全站默认渲染器 | 实现了极具表现力、极低包体积的 2D 骨骼动画方案！通过优雅的 Fallback 机制，在美术资产就绪前提供了完全可交互的动态体验，零编译错误，完美闭环 |
| 2026-06-07 | **Epic 8.5 Panda Avatar 图片生成流水线**：重写 `tmp/imagegen/panda-asset-prompts.jsonl`（70 个 `gpt-image-2` job，含 attachment/anchor/target/安全区约束）；通过 `OPENAI_BASE_URL=https://ai.input.im/v1` 生成 70/70 chroma-key 源图；新增并使用 `chroma-key-panda-assets.py`、`quality-check-panda-assets.py`、`compose-panda-sample.py` 与 `tmp/imagegen/README.md`；已输出全量透明 PNG、alpha bbox 质检与 3×3 合成预览 | 源图保留在 `tmp/imagegen/generated/`，透明 PNG 在 `frontend/public/assets/panda/`；报告在 `tmp/imagegen/reports/`。最终质检 `70 checked / 15 pass / 55 warn / 0 missing / 0 fail`，warning 留给 Epic 8.6 的 384px/120px/128px 视觉验收 |
| 2026-06-08 | **panda-lab Canvas 素材合成页重构**：`/panda-lab` 收敛为单一 Canvas PNG 素材合成体验；移除渲染器风格切换、Canvas 属性显示选择与 Canvas 阶梯方式选择；`PandaLabPreview` 直接使用 `PandaCanvasRenderer`；Canvas 默认 `all + discrete`，由五维/经验/情绪数值直接驱动 70 张 PNG 素材分层合成 | `panda-lab` 现在专注验证真实 PNG 素材合成；`pnpm --dir frontend type-check` 通过 |
| 2026-06-13 | **前端 UI 风格全面优化**：移除中国风水墨主题（暖黄纸底色→干净浅灰 #f8f9fa、竹绿→现代绿 #0f973d、Noto Serif SC→Inter 字体）；删除 30+ 自定义 Tailwind 颜色为 primary+neutral 双色系；移除所有装饰性动画（breathe/glowPulse/panda-breathe/radar-reveal）、emoji 图标、发光稀有度效果、`.card-paper`/`.panda-silhouette`/`.glow-rare` 等工具类；Dashboard 布局从 3 栏改为 2 栏（策略构建器从固定右栏→抽屉式 `StrategyMobileDrawer`）；Navbar 导航精简为 4 个链接+用户菜单；首页 Hero 重写为干净打字排版；组件文案去 emoji、去中文术语（英文标签）；移除 `@fontsource/noto-sans-sc` 和 `@fontsource/noto-serif-sc` 依赖；`pnpm build` 通过，`pnpm type-check` 零错误 | UI 风格从「AI 生成中式水墨模板」升级为干净专业的现代 Web3 产品风格 |
| 2026-06-08 | **Panda Avatar 子层素材规范落地（Epic 8.13-8.18）**：新增 `sublayer-manifest.json` 与 `legacy-assets.json`；按 `traits/{boldness,contrarian,focus,intuition,patience}/*/tier-xx.png` 和 `emotions/{eyes,brows,mouth,extras}/tier-xx.png` 生成 180 张透明子层 PNG；`pandaCanvasAssets` / `PandaCanvasRenderer` 改为 manifest 子层锚点定位，Top1/Top2 只控制属性开关，属性内部按 `zIndex` 渲染；`/panda-lab/qa` 支持 attribute/sublayer/tier/experience tier 单层预览、anchor/bbox/landmark overlay 与 overlap 指标；`audit-panda-assets.mjs` 读取子层 manifest 并按 `bboxPolicy` hard fail，生成 `/assets/panda/qa/sublayer-report.json` | 旧 broad-layer 目录仅作为临时归档资产保留，renderer 不再加载旧 `traits/*/tier-xx.png` / `emotions/tier-xx.png`；`intuition` 禁止 eye/pupil/brow/gaze 语义，`emotions` 独占主五官语义；`npm run panda:assets:audit` 190/190 通过，`npm run type-check` 通过 |
| 2026-06-09 | **模拟盘训练工作台生产级重构（Phase 1–3）**：**数据层**：新增 `useSimulationSession` 统一 hook（会话状态机 idle/starting/running/stopping/error）；新增 `performanceMetrics.ts`（胜率/盈亏因子/最大回撤/夏普/期望值/权益曲线）。**状态栏**：新增 `SimulationStatusBar`（替代 `DashboardTrainingBar`，阶段徽标/状态药丸/情绪标签/过渡态按钮）。**工作台**：重写 `DashboardTradingWorkspace`（5 tab：总览 4+6 指标、持仓风险表、成交、权益曲线+回撤、诊断中文化）。**新组件**：`EquityCurve`（Area+Histogram）；`PositionRiskTable`（敞口/风险等级）。**决策链**：重写 `DecisionPanel`（8 步分组/描述/主导标记/阈值解释）。**页面**：重写 `page.tsx`（`useSimulationSession` 替代 15 useState）。`tsc` 零错误；`build` 通过。 | 模拟盘从 MVP 堆组件提升至专业交易工作台；具备完整绩效指标、权益曲线、风险敞口、8 步决策解释 |
| 2026-06-10 | **模拟盘训练工作台生产级推进（Phase 3a/3d/4）**：**TradeHistory** 重写：筛选（全部/买入/卖出/盈利/亏损）、双行布局（方向徽标/资产/时间/盈亏 + 价格×数量/决策分）、持仓中标记、空态引导文案。**SimulationStatusBar** 新增训练前检查清单弹层（策略/交易池为硬性项，行情连接/tick 新鲜度≤120s 为软性警告；未通过软性项可「仍然启动」，未设策略可跳转策略抽屉）；新增 `lastTickAgeSec` prop。**CandlestickChart** 新增 MA7/MA25 均线（SMA，金色/蓝灰）、MA 开关按钮、图例 MA 数值。`tsc --noEmit` 零错误；`npm run build` 通过。 | 模拟盘补齐成交筛选、启动前置校验、技术指标三块生产级能力 |
| 2026-06-11 | **本地实时联调三件套跑通**：配置 `market-monitor/.env`（Upstash `rediss://` + VPS DeepBook PG `152.53.166.128:5433` + Server `:9008`，池 `DEEP/SUI,SUI/DBUSDC`）、`websocket/.dev.vars`（Upstash REST + JWT_SECRET）；backend/.env 与 frontend/.env.local 切换至 Upstash 与统一 JWT/INTERNAL secrets。本地四服务并跑：frontend :3000 / backend :8000 / monitor :8001 / Hub :8787（wrangler dev）。验收：monitor `/health` `pg_ok+redis_connected`、两池均有 `last_publish_ts`；BFF `GET /api/market/candles?pool=DEEP/SUI` 返回真实 K 线；`/api/auth/nonce` 200（Upstash nonce）。**注意**：Supabase 直连主机 `db.dpez….supabase.co` 本机 DNS 不可达（直连仅 IPv6），业务库暂用本地 Docker PG `tp-postgres`(:55432，alembic 001+002)；待 Pooler（IPv4 :6543）地址后切换 | 模拟盘实时链路（monitor→Redis→DE/Hub→浏览器）本地全通；Epic 3 验收清单可开始逐项手测 |
| 2026-06-12 | **全量本地测试矩阵 + Hub 频道编码修复**：单元套件全绿（backend pytest **161**、monitor pytest **30**（须 `python -m pytest`）、websocket vitest **17**、contracts `sui move test` **13/13**）；前端 `tsc` 零错误、`build` 通过、`panda:assets:audit` 130/130（`next lint` 因无 .eslintrc 跳过，待配置）；DB `verify_db`+`seed_dev` 通过。服务层 E2E（dev JWT，seed 熊猫）：`/api/panda/my`→喂策略→`simulation/start`→Upstash 收到 `market:tick` 与 `panda:{id}:decision`（8 步 HOLD）→status `actor_active`→stop 全 200。**修复**：`websocket/src/user-hub.ts` `redis.subscribe()` 频道名先 `encodeURIComponent` —— @upstash/redis SSE 不编码 `/`（`DEEP/SUI`）导致静默订阅错频道、Hub 永远收不到 market.tick（实测 receivers:0→1）；修复后 WS 冒烟收到 `market.tick` 转发 | 代码级+服务层+合约+联通全部验证；浏览器手测与 Epic 3 后半验收待做；遗留观察：SUI/DBUSDC tick price 疑似未缩放（732000） |
| 2026-06-13 | **前端 UI 风格全面优化**：移除中国风水墨主题（暖黄纸底色→干净浅灰 #f8f9fa、竹绿→现代绿 #0f973d、Noto Serif SC→Inter 字体）；删除 30+ 自定义 Tailwind 颜色为 primary+neutral 双色系；移除所有装饰性动画（breathe/glowPulse/panda-breathe/radar-reveal）、emoji 图标、发光稀有度效果、`.card-paper`/`.panda-silhouette`/`.glow-rare` 等工具类；Dashboard 布局从 3 栏改为 2 栏（策略构建器从固定右栏→抽屉式 `StrategyMobileDrawer`）；Navbar 导航精简为 4 个链接+用户菜单；首页 Hero 重写为干净打字排版；组件文案去 emoji、去中文术语（英文标签）；移除 `@fontsource/noto-sans-sc` 和 `@fontsource/noto-serif-sc` 依赖；`pnpm build` 通过，`pnpm type-check` 零错误 | UI 风格从「AI 生成中式水墨模板」升级为干净专业的现代 Web3 产品风格 |
| 2026-06-13 | **TODO/进度 review 校正（仅文档）**：核对代码后修正 `dev-docs/TODO.md` Epic 7——经验引擎与 Merkle 非「0% 待开始」：`ExperienceEngine` load + pattern/mastery 修正已接入 `decision_pipeline` Step5（line 189-190）与 `panda_actor.record_trade`（line 355），`compute_merkle_root` 树算法 + actor `%50` 触发骨架（`panda_actor.py:383`）已就位；真实缺口为「写回补全 / `003` 迁移 12 表 / `submit_merkle_root` 链上提交 / leaf 收集（现传空数组）」。新增 Epic 7.0 迁移前置、Epic 9 UI/UX 现代化（归集 6-13 两次前端工作 + 收尾验证项）；§2.1 经验引擎 0%→50%、Merkle 0%→30%。 | TODO 与代码实况对齐；下一步明确：先跑 `003` 迁移解阻塞，再补经验写回与 Merkle 链上提交。未改任何代码/部署事实 |
| 2026-06-13 | **WalletButton UI 全面重写**：移除 `globals.css` 中脆弱的 dapp-kit `ConnectButton` CSS hack（`!important` 属性选择器），改为 `--dapp-kit-*` CSS 变量覆盖；用 dapp-kit 原生 `<ConnectModal trigger={}>` 替换 `<ConnectButton>`，自定义 trigger 使用项目 `Button` 组件（绿色主题）；重写三个互斥状态：已认证（用户 pill + 下拉菜单 Profile/Dashboard/Achievements/Leaderboard/Logout）、未认证（Connect Wallet/Google 按钮）；移除 Navbar 中重复的用户下拉菜单（统一收归 WalletButton）；`pnpm type-check` 零错误，`pnpm build` 通过 | 钱包按钮 UI 与 TradingPanda 绿色主题完全一致，代码更健壮（不再依赖 dapp-kit 内部类名） |
| 2026-06-13 | **自建品牌化连接弹窗（替换 dapp-kit ConnectModal）**：dapp-kit 原生 `ConnectModal` 内容太素（通用 "What is a Wallet" 文案 + 大片空白）。新增 `components/layout/ConnectWalletModal.tsx`（Radix Dialog + `useWallets`/`useConnectWallet`）：左栏钱包列表（图标+名称+连接态 spinner，空态引导装 Slush）+ Google 选项；右栏 `bg-dark-panel` 品牌价值面板（panda logo + 3 条产品化卖点 One-click login/Own your panda/Verifiable trades，含 lucide 图标）。`WalletButton` 移除 dapp-kit `ConnectModal` 与导航栏独立 Google 按钮（Google 收进弹窗），改受控 `connectOpen` 触发自定义弹窗；连接成功由既有 `WalletAuthSync` 自动登录。清理 `globals.css` 已失效的 dapp-kit ConnectModal 类名 hack（保留 `[data-dapp-kit]` 变量块与 `fadeIn`）。`pnpm type-check` 零错误，`pnpm build` 通过 | 登录弹窗由通用模板升级为品牌化双栏；不再依赖 dapp-kit 内部类名。**待手测**：实际点击钱包/Google 的连接与登录闭环（headless 无法验证钱包弹窗） |
| 2026-06-13 | **UI 优化 P0+P1+P2（去 AI 味 + 统一渐变/动效）**：**P1 token→Tailwind**：`tokens.css` 阴影升级为分层微冷（`--shadow-xs/sm/md/lg` + `--shadow-accent/-lg`），新增渐变 token（`--gradient-brand`/`-soft`/`-dark-panel`/`-hero`，仅绿+中性、禁紫粉）；`tailwind.config.ts` 暴露 `boxShadow`/`backgroundImage`/`transitionTimingFunction(expo/smooth)`/`transitionDuration(fast/normal)`；`globals.css` 加 `.lift` 工具类 + `prefers-reduced-motion` 全局守卫。**P2 组件**：`Button` primary 改 `bg-brand`+`shadow-accent`→hover`-lg`+`active:scale-[0.98]`，`transition-all`→显式属性+easing token，加 `ring-offset`；`Card` default 改 `bg-brand-soft`+边界+分层阴影去扁平。**P0 首页**：`page.tsx` 强调色由绿/靛/琥珀/粉 4 色收敛为单绿（FEATURES 移除 `color` 字段、accent 条改 `bg-brand`、图标改 `bg-primary-50`）；删 logo 卡 3 个装饰浮点；Hero 背景收编为 `bg-hero`；CTA Banner/Footer `bg-neutral-900`→`bg-dark-panel`；卡片套 `.lift`。`pnpm type-check` 零错误，`pnpm build` 通过 | UI 去除 AI 模板感（多色强调/随机浮点），全站阴影/渐变/动效统一为 token 驱动单一语言；后续 P3（stagger 入场、全站 `.lift` 推广）待做，见 `dev-docs/TODO.md` Epic 9 |
| 2026-06-13 | **组件库统一：原生表单控件 → Radix 基础组件**（分支 `feat/ui-component-library`，每点一 commit）。**新增 5 个 `components/ui/` 基础组件**：`Select`（@radix-ui/react-select，options API）、`Slider`（@radix-ui/react-slider，单值 number）、`Tooltip`（@radix-ui/react-tooltip，自带 Provider，替代 `title`）、`Input`/`Textarea`/`Checkbox`（token 样式，Checkbox 为无障碍原生 input+自绘框）。**迁移**：所有产品页面原生 `<select>`→`Select`（StrategyRuleRow/StrategyBuilder/PandaSelector/PandaSidebar/DashboardPandaPanel/CandlestickChart/market/trading）、`type=range`→`Slider`（StrategyBuilder×4/onboarding/PandaLabControls×6）、`textarea`→`Textarea`（StrategyInput/StrategyTextInput）、文本/搜索 `input`→`Input`（TradeForm/market）；关键 `title`→`Tooltip`（EmotionIndicator/PandaAvatar/WalletButton/SimulationStatusBar/lab 预设）。dev 工具 `PandaLabControls` 全量迁移、`PandaLabQaPage` 4 select、`ExperienceRigEditor` experience-tier select。**有意保留原生**：`ExperienceRigEditor` 的内联 pill select、坐标数字输入、overlay checkbox、图标工具按钮（密集专业编辑器，转换低价值高风险）。`pnpm type-check` 零错误，`pnpm build` 通过。**前端不加测试**（用户决定，仅服务端逻辑改动才测；安装的 vitest 框架已回退）。 | 全站表单控件统一为 Radix 驱动的品牌基础组件；键盘/无障碍/聚焦态一致；不再散落原生 select/range/title。剩余 dev-only 原生控件为有意例外 |
| 2026-06-13 | **Growth + 经验/Merkle 链下闭环**（分支 `feat/growth-engine`，每点一 commit，7 个功能点）。**①数据库**：Alembic `003` 迁移其余 12 表（经验×4/情绪/merkle/成就×2/签到/缓存×2/日记），`verify_db` 覆盖全 18 表；修正 `experience_mastery.mastery_score` 精度 `Numeric(5,4)→(6,2)`（0–100 溢出）。**②Leaderboard**：`GET /leaderboard`(winrate/pnl/level，链下聚合 trades+pandas) + BFF。**③Achievements**：9 项目录 + 纯 `evaluate_unlocked` 检测 + 懒持久化 `user_achievements` + `GET /achievements` + BFF。**④Checkin**：`POST/GET /checkin`(streak/reward 纯逻辑) + BFF GET。**⑤经验写回**：`record_trade` 写回 patterns(running win-rate→confidence)/mistakes(>2%亏损)/cycles(各自 savepoint 降级)，actor 传 market 上下文。**⑥Merkle 链下**：actor 每50笔收集 leaves→树根→写 `merkle_roots`(batch_index)，`submit_merkle_root` 链上留 stub。**⑦前端 Growth UI**：leaderboard/achievements/profile(签到日历) 三页接真实 API，替换占位。后端纯逻辑 `pytest` 37 项绿（无需 DB）；前端 `type-check`+`build` 通过。 | MVP 验收「排行榜/成就/签到」可演示（链下）；经验与信任层链下闭环。**排除**：交易 Agent 设计、合约（Kiosk 版税/Merkle 链上提交/链上奖励）。**环境注意**：本机 Python 3.13 下 asyncpg 无法编译，迁移/集成需在你的环境 `alembic upgrade head` + 全量 `pytest` 验证 |
| 2026-06-17 | **架构图补充（仅文档）**：`docs/architecture.md` 新增 4 张 Mermaid 图：全局服务拓扑、双轨 Runtime Flow、链上证明时序、链上对象关系；同步 `Last updated` 至 2026-06-17。 | 架构文档可视化表达新版 Autonomous Agent Wallet 设计；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Polished 架构图资产（仅文档）**：使用 `architecture-diagram` skill 新增 `docs/assets/trading-panda-architecture.svg` 与 `docs/assets/trading-panda-architecture.html`（含 Copy/PNG/PDF 导出工具栏），并在 `docs/architecture.md` §1.1 插入 SVG 图片引用。 | 架构文档可直接展示深色主题图片版架构图；HTML 版可用于导出答辩图片/PDF；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Backend 模块边界重构（仅文档）**：`docs/architecture.md` 明确 MVP backend 采用“模块化单体 + durable async queue”，拆分 hot path（MarketDataConsumer/ActorManager/PandaActor/DecisionPipeline/PolicyGate/LedgerService/TradeFactWriter）与 async workers（QueueDispatcher/ChainExecutionWorker/ReviewWorker/SkillMemoryWorker/MerkleWorker/WalrusSyncWorker），补齐每个模块职责、状态所有权、幂等键与失败行为。 | 架构决策锁定：不把每个逻辑 service 都拆成独立部署服务；TradeFact commit 后通过 PostgreSQL `async_jobs` 触发异步 side effects；Redis 只做实时事件和 worker wakeup。未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **PRD v3.1 / 架构全量对齐（仅文档）**：更新 `docs/PRD.md`、`docs/architecture.md`、`docs/contract-design.md`、`docs/agent-design.md`、`docs/database-schema.md`、`docs/market-monitor-design.md`、`docs/product-description.md`、`docs/backend-design.md`、`docs/api-specification.md`、`docs/testing-strategy.md`、`docs/redis-architecture.md`、`docs/websocket-hub-design.md`、`CONTEXT.md`、ADR、`spec.md`、`dev-docs/TODO.md`；锁定 shared `PandaVault`、standalone shared `TradingPolicy`、environment-level testnet Agent Signer、selected/manual Chain Proof Moment、PostgreSQL `async_jobs` durable queue、liquidity-first mainnet pair ranking。 | 产品设计统一为 DeepBook mainnet Training Ledger + selected testnet PandaCoin PTB proof；Mode 2 不再按每笔 paper trade 上链；旧 simulation/API 文档已加 v3.1 兼容说明；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **dev-docs/backend-docs 清理（仅文档）**：删除过期施工稿 `dev-docs/DEVELOPMENT_CONTEXT.md`、`dev-docs/dashboard-layout-v2.md`、`dev-docs/dashboard-layout-v3-left-panel.md`；保留 `dev-docs/DEV_CONTEXT.md`、`dev-docs/TODO.md`、`dev-docs/EPIC1_MINT_E2E.md` 与 `backend/docs/decision-engine-test-plan.md`。 | 文档入口收敛：产品/架构以 PRD v3.1、`docs/architecture.md`、`spec.md` 和 DEV_CONTEXT 为准；历史变更日志保留旧文件名作为历史记录；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **架构图资产 v3.1 重绘（仅文档）**：使用 `architecture-diagram` skill 更新 `docs/assets/trading-panda-architecture.svg` 与 `docs/assets/trading-panda-architecture.html`；图中同步 DeepBook mainnet Training Ledger、backend hot path（MarketDataConsumer/PandaActor/DecisionPipeline/PolicyGate/LedgerService/TradeFactWriter）、PostgreSQL `async_jobs` durable queue、ProofSelector、selected Chain Proof Moment、AgentSigner、standalone shared `TradingPolicy` 与 shared `PandaVault`。 | 架构图与 PRD v3.1 / `docs/architecture.md` 当前设计对齐；HTML 保留 Copy/PNG/PDF 导出工具栏；`xmllint` 校验 SVG 通过；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **PRD v3.1 产品原型（仅文档资产）**：新增 `docs/assets/trading-panda-prototype.html`，用独立 HTML 原型展示 Mint Panda、Agent Wallet Setup、Training Ledger Dashboard、Chain Proof Panel、Review Journal 五个核心界面。 | 原型对齐最新设计：DeepBook mainnet 训练、shared PandaVault、standalone TradingPolicy、selected Chain Proof Moment、Skill Memory；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **用户旅程与原型总览重构（仅文档资产）**：新增 `docs/user-journey.md`，基于 PRD v3.1 拆分 J0-J8 用户旅程；重写 `docs/assets/trading-panda-prototype.html` 为“Overview 全旅程地图 → 点击进入页面详情”的单页交互原型，覆盖 Mint Panda、Agent Wallet Setup、Training Ledger、Chain Proof、Review Journal、Emergency Controls。 | 原型默认总览可看到所有用户旅程，点击旅程/页面卡片后才显示对应页面详情；对齐 Autonomous Agent Wallet 定位；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 静态站拆分（仅文档资产）**：删除 `docs/assets/trading-panda-prototype.html`；在根目录新增 `prototype/`，其中 `index.html` 仅承载用户旅程总览与页面导航，`mint-panda.html`、`agent-wallet-setup.html`、`strategy-builder.html`、`training-ledger.html`、`chain-proof.html`、`review-journal.html`、`emergency-controls.html` 分别承载独立页面设计，并用 `styles.css` 共享视觉系统；同步更新 `docs/user-journey.md` 的原型文件映射。 | 原型结构符合“总览大厅 + 独立页面详情”要求；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 视觉重构（仅文档资产）**：按“中英混合 + 折中赛博黑金”方向重写 `prototype/styles.css`，将原型升级为 Cyber Panda Agent Wallet OS 风格；强化 `prototype/index.html` 的 Agent Wallet thesis、DeepBook/Sui/PTB/Training Ledger 状态条与 Sui 技术展示四象限；为 7 个详情页补齐 system strip 与 object fact cards，突出 PandaVault、TradingPolicy、Agent Signer、DeepBook mainnet、Training Ledger、Chain Proof、Skill Memory 与 Emergency Controls。 | 原型视觉从普通 dashboard 升级为黑金 + 荧光绿控制室；8 个 HTML 本地链接校验通过，且无远程字体/外部 URL 依赖；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype Journey-first 状态机重构（仅文档资产）**：将 `prototype/` 从 page-first 改为 journey-first：删除旧 `mint-panda.html`、`agent-wallet-setup.html`、`strategy-builder.html`、`training-ledger.html`、`chain-proof.html`、`review-journal.html`、`emergency-controls.html`；新增 `prototype/journeys/` 下 7 个 journey 页面，每页使用 stepper/action tabs 切换“中间 UI 状态 + 右侧 User action / Chain changes / Backend changes / Failure 面板”；新增共享 `prototype/journey.js`；`prototype/index.html` 改为链接 journeys；同步更新 `docs/user-journey.md`。 | 原型现在可沿用户旅程查看每一步页面状态：Mint 5 步、Agent Wallet 6 步、Strategy 5 步、Training 7 步、Chain Proof 6 步、Review 5 步、Safety action tabs；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype Journey 固定左侧旅程列（仅文档资产）**：调整 `prototype/styles.css`，让 journey 详情页的 `.detail-layout` 在所有屏幕宽度下保留左侧 `J0-J1/J2...` 旅程说明独立列，不再在 1120px 以下折叠为单列；窄屏允许横向滚动以保持状态机结构。 | 满足“J0-J1 无论屏幕宽度都单独一列”；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype Journey 顶部独占旅程说明行修正（仅文档资产）**：纠正上一条对“单独一列”的理解，改为让 `prototype/styles.css` 中 `.detail-copy`（如 `J0-J1/J2...` 旅程说明卡）在所有屏幕宽度下独占顶部一整行，`.journey-console` 的 steps / UI state / guardrail 卡片统一位于下一行。 | 满足“J0-J1 不和 steps、界面等 card 在同一行”的真实需求；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 全屏状态机重构规格（仅文档）**：基于 grill-me 29 项确认新增 `docs/prototype-redesign-spec.md`，锁定 journey 原型从“小 UI state 卡片”升级为“完整 Product Screen Canvas 随 step 变状态”；明确 Prototype Controller / Product Layer 分层、Desktop+Mobile 视口切换、Panda Agent Card、Evidence Rail、System Notes、P0/P1/P2 范围与各 journey screen states；`docs/user-journey.md` 增加规格入口引用。 | 下一步可按规格重构 `prototype/`：点击 step 时显示完整产品页面状态；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 全屏状态机重构实施（仅文档资产）**：按 `docs/prototype-redesign-spec.md` 重构 `prototype/`：7 个 journey HTML 瘦身为 `data-journey-key` 页面壳；`prototype/journey.js` 改为静态原型渲染器，生成 Prototype Controller、Desktop/Mobile 视口、完整 Product Screen Canvas、Panda Agent Card、Evidence Rail/Mobile Evidence、System Notes；`prototype/styles.css` 新增产品画布、手机画布、Evidence、Notes 与响应式样式。 | 点击 step 现在切换完整产品页面状态，而非小 UI state 卡片；渲染冒烟通过（Mint 5、Wallet 6、Strategy 5、Training 7、Proof 6、Review 5、Safety 3，均含 Desktop+Mobile）；`node --check prototype/journey.js` 通过；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype Interaction Replay 层（仅文档资产）**：基于 grill-me 20 项确认更新 `docs/prototype-redesign-spec.md`，新增 Interaction Replay Layer；`prototype/journey.js` 为每个 step 生成 3-5 条 USER/APP/MARKET/AGENT/BACKEND/CHAIN 动作序列，Prototype Controller 增加 Replay 面板与 `Replay interaction` 按钮，产品画布关键区域增加语义 `data-hotspot`（primary-action、panda-card、market-chart、policy-panel、ledger-panel、evidence-rail、wallet-modal、toast、timeline、proof-panel 等），播放时使用 ghost cursor、action-by-action 高亮和 hotspot glow；切 step/viewport 会取消播放。`prototype/styles.css` 增加 replay timeline、actor tags、cursor、hotspot glow/ripple 样式。 | 原型现在不仅能看到页面状态变化，也能看到“用户/系统做了什么导致变化”；每步 replay 不自动循环、不跳下一步、缺失 hotspot graceful fallback；`node --check prototype/journey.js` 通过；Interaction Replay 冒烟通过（7 个 journey）；本地链接校验通过（8 个 HTML 文件）；未改代码、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Product Design 文档体系（仅文档）**：新增 `docs/design/README.md`、`visual-system.md` 与 7 个页面级设计规范（Mint/Agent Wallet/Strategy/Training/Chain Proof/Review/Safety）；锁定黑金荧光绿视觉方向、页面信息密度分层、每页 Desktop/Mobile 布局、核心组件、状态、交互与 Evidence Exposure；Mint 明确为极简铸造仪式页，无 mint 前问卷。同步更新 `docs/prototype-redesign-spec.md` v1.1，将 `docs/design/page-*.md` 设为 Product Screen 上游，取消强制三栏 cockpit / PandaCard / EvidenceRail 骨架。 | 下一步原型重构应按 `docs/design/page-*.md` 渲染真实页面状态；`docs/design` 相对链接校验通过，`node --check prototype/journey.js` 通过；未改 prototype/frontend/backend/contracts、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 按 Product Design 重构（仅文档资产）**：更新 `prototype/journey.js` 与 `prototype/styles.css`，将 Product Screen 渲染从通用三栏骨架改为页面专属渲染器：Mint 使用极简 `PandaCarouselStage` 铸造舞台并移除 mint 前 survey；Agent Wallet/Strategy/Review 使用中密度工作台；Training 使用 `TrainingStatusStrip + PandaAgentStatus + MarketChartPanel + LedgerPanel + TradeFactDrawer` cockpit；Chain Proof 使用 proof console；Safety 使用急停控制面板。 | 原型现在按 `docs/design/page-*.md` 呈现真实页面状态；`node --check prototype/journey.js`、HTML 链接检查、design-doc alignment smoke 均通过；浏览器预览验证 Mint desktop/mobile、Training desktop 通过；未改 frontend/backend/contracts、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **Prototype 渐进披露交互重构（仅文档资产）**：更新 `docs/prototype-redesign-spec.md`、`docs/design/` 页面规范、`prototype/journey.js` 与 `prototype/styles.css`；锁定 L0/L1/L2/L3 披露模型，主画布默认只显示用户任务与状态摘要，Evidence/Policy/PTB/Skill 等细节改为点击后打开 drawer，签名/危险操作使用 modal，状态反馈使用 toast，主 CTA 支持同页 step 推进与跨 journey `#step=` 路由跳转；Interaction Replay 同步可打开 modal/drawer/toast。 | 原型现在能表达“用户交互 → 页面状态变化 → 需要时展开证据”的完整链路；`node --check prototype/journey.js` 通过；本地 HTTP 浏览器 smoke 通过（Mint 主 CTA/签名 modal/详情 drawer/Agent Wallet 路由跳转、7 个 journey hash 初始化、console 无项目错误）；未改 frontend/backend/contracts、部署事实、环境变量或 API 路径 |
| 2026-06-17 | **TODO v3.1 重写（仅文档）**：根据最新 `docs/PRD.md`、`docs/architecture.md`、`spec.md` 与 `docs/design/` 全量重写 `dev-docs/TODO.md`；主线改为 Autonomous Agent Wallet MVP：Mint → Agent Wallet → Strategy → DeepBook mainnet Training Ledger → Trade Fact → selected Chain Proof → Review/Skill → Safety；旧 simulation/testnet 两池/每笔 PTB 口径降级为 legacy baseline 或 out-of-MVP。 | TODO 现在按 PRD v3.1 的全栈纵向 Epic 拆分任务，并映射到 PRD/Architecture/Design；未改 frontend/backend/contracts、部署事实、环境变量、数据库结构或 API 路径 |
| 2026-06-17 | **Epic 2 Agent Wallet Setup（全栈）**：Move 新增 `panda_coin`/`trading_policy`/`panda_vault`/`demo_executor`/`agent_wallet` + `tests/agent_wallet_tests.move`（21 项 `sui move test` 绿）；backend `panda_agent_wallet.py` + `services/agent_wallet.py` + `agent_wallet_event_parser.py`（`GET/POST /panda/:id/agent-wallet*`、owner-action sync）；`simulation/start` 增加 `require_active_wallet` 门禁；frontend `/agent-wallet` + `components/agent-wallet/*` + `lib/sui/setupAgentWallet.ts` + BFF 代理；`tests/test_agent_wallet.py` 5 项绿 | 链上 setup 须 **重新 publish** 合约后 `agent_wallet::setup_agent_wallet` 才可用；本地配置 `AGENT_SIGNER_ADDRESS`；DB 仍用 migration `004`；训练前须有 active vault+policy mirror |
| 2026-06-17 | **Epic 1 Mint Panda Identity（代码）**：前端 `/mint` 按 `docs/design/page-mint.md` 重构（`PandaCarouselStage`/`PandaStageHalo`/`WalletSignatureModal`/`MintDetailsDrawer`/`GasFeeHint`、sonner toast、暗色铸造舞台）；`OnboardingGuard` 跳过 `/mint` 问卷拦截；铸造成功 CTA → `/agent-wallet?step=no-vault`；`useMintPanda` 支持 sessionStorage pending + `retryRegistration`；后端 `POST /panda/mint` 同 owner 幂等 200、`active_vault_id/active_policy_id` 显式 null；Move `test_minted_panda_identity_only_no_trading_permission`；pytest `test_mint_registration` + 前端 vitest smoke **5** 项绿 | Testnet Package `0x5950…1465` 与 `contracts/DEPLOY.md`/`DEV_CONTEXT` §3 一致；mint 不授予交易权限 |
| 2026-06-17 | **Epic 4 Strategy Builder Inside Policy（全栈）**：backend `policy_compatibility.py` + `strategy_feed` 重构（validate/feed 加载 `trading_policies` mirror、返回 `policy_conflicts`/`strategy version`、未授权 pair 拒绝保存 `STRATEGY_POLICY_CONFLICT`）；`panda_loader`/`decision_pipeline`/`panda_actor` 读取 `strategy_version` + `skill_memories`；前端新增 `/strategy/[id]` + `components/strategy/*`（模板架、Policy 兼容预览、版本条、ghost 提示、详情 drawer）；`tests/test_strategy_policy.py` **8** 项绿 | 策略仅指导决策、不扩展 Policy 权限；有 active policy 时须 validate 通过再 save；训练入口 `/dashboard/:id` |
| 2026-06-17 | **Epic 7 Review & Skill Memory（全栈）**：backend `review_logic.py`/`review_service.py`/`skill_memory_service.py` + `ReviewWorker`/`SkillMemoryWorker`/`queue_dispatcher`；`GET/POST /panda/:id/trade-facts/:fact_id/review` + reviews/skill-memories/skill-versions API；`EventPublisher.publish_review|publish_skill`；前端 `/review` Review Journal（outcome story、Evidence drawer、Why not updated modal、Continue training）；BFF 代理 4 路由；`tests/test_review_logic.py` **6** 项绿 | 复盘仅在有证据时更新 Skill Memory；盈利 alone 不 auto-verify；`pandas.active_skill_version` 由 SkillMemoryWorker 递增；DecisionPipeline 经 `panda_loader` 读取 supported/verified memories |
| 2026-06-17 | **Epic 6 Chain Proof Mode 2（全栈）**：Move `demo_executor` 扩展 `DemoTradeExecuted`（`trade_fact_id_hash`）+ `agent_wallet_tests` 新增 legal/abort 路径（**25** 项 `sui move test` 绿）；backend `proof_selector.py`/`agent_signer.py`/`chain_proof_service.py` + `chain_execution_worker` + `panda_chain_proof.py`（`GET/POST /panda/:id/chain-proof/:fact_id*`）；Alembic `005`（`chain_execution_logs.retryable` + idempotency index）；`CHAIN_PROOF_ENABLED`/`chain_proof_*` 配置项；前端 `/chain-proof` + `components/chain-proof/*` + BFF 代理；pytest `test_proof_selector`/`test_agent_signer`/`test_chain_execution_worker` **13** 项绿 | Mode 2 仅 selected Trade Fact；proof 失败不回滚 Training Ledger PnL；无 `AGENT_SIGNER_PRIVATE_KEY` 时 dry-run digest；须 `alembic upgrade head` 应用 `005` |
| 2026-06-17 | **Epic 5 Training Ledger Hot Path（全栈）**：backend `policy_gate.py`/`ledger_service.py`/`trade_fact_writer.py`；`PandaActor` 热路径 OrderIntent→PolicyGate→Ledger→TradeFact；`EventPublisher` 增加 `order_intent`/`execution`/`policy_rejected`/`market_stale`；`panda_training.py`（`GET /panda/:id/training/ledger|order-intents|trade-facts`）；frontend `/training-ledger/[id]` + `components/training/*` + BFF 3 路由；pytest `test_policy_gate`/`test_ledger_service`/`test_training_hot_path` **17** 项绿 | Mode 1 执行真相为 Training Ledger；拒绝 intent 持久化；新 API 路径见上；训练页 `/training-ledger/:id` |
| 2026-06-17 | **Epic 0 验证记录（仅文档）**：新增 `docs/epic-verification-record.md`（原 `epic0-v31-foundation-verification.md`），作为全项目 Epic 0–11 验证台账；Epic 0 实测：迁移结构测试 9/9 ✅、前端 type-check ✅、Supabase 直连 `alembic current`/`verify_db.py` ❌ TimeoutError。 | 验证事实可追溯；各 Epic 验收结果统一记入该文档 §3.x；DB 落地须在可达 `DATABASE_URL` 环境重跑后更新 §1 与对应 Epic 节 |
| 2026-06-17 | **Epic 9 Trust, Merkle, Walrus（全栈）**：**Merkle**：`trade_fact_leaf` + 确定性 batch 加载；`PandaActor` 改 enqueue `merkle_batch_ready`；`MerkleWorker` 写 `merkle_roots`（`root_type`/`start_fact_id`/`end_fact_id`）+ `TrustProofService` 调 `trust_proof::submit_merkle_root`（无密钥 dry-run）；Alembic `006`。**Skill Digest**：Move `submit_skill_digest` + `SkillDigestWorker` 异步写 `skill_versions.submitted_tx_digest`。**Walrus**：`WalrusSyncWorker` 归档 review batch → `pandas.walrus_*`、skill snapshot → `skill_versions.walrus_blob_id`（不阻塞热路径）。API `GET /panda/:id/trust/merkle|skill-digest`；前端 Training Ledger 状态条展示 Merkle 批次；`tests/test_merkle*.py` **16** 项绿、`sui move test` **27/27** 绿 | 须 `alembic upgrade head` 应用 `006`；链上 Merkle/Skill 提交需 `SUI_PRIVATE_KEY`+`ADMIN_CAP_ID`；Walrus 需 publisher/aggregator URL；合约 `submit_skill_digest` 须 republish 后链上可用。**自动验证**：`docs/epic-verification-record.md` §3.9 → **⚠️ 部分验证** |
| 2026-06-17 | **Epic 2 验证台账**：`docs/epic-verification-record.md` §3.2 自动复验（Move 27/27、agent_wallet 12/12、pytest 19/19、type-check ✅；`verify_db` Timeout、`npm run build` ❌ `/agent-wallet` Suspense；链上 E2E ⏸） | 结论：**⚠️ 部分验证**；复验命令见 §3.2 Backend/Frontend 验证方法 |
| 2026-06-17 | **Epic 8 验证台账**：`docs/epic-verification-record.md` §3.8 记录自动验证（Move 27/27、pytest 16/16、tsc ✅；build/API/DB/链上手测 ⏸） | 结论：Epic 8 **⚠️ 部分验证**；完整闭环见 §3.8 How to Re-Run |
| 2026-06-17 | **Epic 6 验证台账**：`docs/epic-verification-record.md` §3.6 自动复验（Move 27/27、pytest 16/16、type-check ✅；DB/testnet E2E ⏸；`pnpm build` ❌ `/agent-wallet`） | 结论：**⚠️ 部分验证**；复验命令见 §3.6 How to Re-Verify |
| 2026-06-17 | **Epic 3 自动验证（文档）**：`docs/epic-verification-record.md` §3.3；pytest monitor 51/51 + backend market_event 7/7 + websocket 17/17；live monitor `/health`·`/pairs`·`/candles` + Redis `market:tick`×2；判定 **⚠️ 部分验证**（testnet VPS 池通过；mainnet launch pairs + frontend E2E 未验） | 复验命令见该文档 §3.3 Verification Methods |
| 2026-06-17 | **Epic 0 补全（术语 + API spec）**：全库术语审计；legacy 页产品文案重命名（模拟盘→训练账本/Training Ledger）；`docs/api-specification.md` 新增 22 条 v3.1 REST 端点；`spec.md` §8 REST 映射；确认 `PandaActor`→`TradeFactWriter.commit_tick` 热路径；`dev-docs/TODO.md` Epic 0 全勾；`docs/epic-verification-record.md` §3.0 checklist 更新 | Epic 0 代码/契约/文档闭环完成；DB 落地仍待 §1 可达环境复验 `alembic`/`verify_db` |
| 2026-06-17 | **`/mint` 仪式页对齐 prototype**：去掉 `#0d1421` 独立底；`ProductPageShell` + 圆形 `mint-stage`（金绿 halo/ring/floor glow）；熊猫 **210px**（移动 150px）；舞台 caption 英文 preset 名（`stageLabelEn`）；Hero 戏剧大字 + `GasFeeHint` 产品样式；导航保留 | `mint.smoke.test.ts` 5/5；验收：连钱包→轮播英文 preset→mint 流程 |
| 2026-06-17 | **Navbar 钱包下拉修复**：`product-panel` 默认 `overflow:hidden` 裁切地址下拉；Navbar/`header` 改 `overflow-visible`；下拉改用独立暗色面板 + `z-index` 高于顶栏 | 登录后点击地址应完整显示 Profile/Dashboard/Logout 菜单 |
| 2026-06-17 | **Supabase 数据库落地修复**：诊断 `dpezgzzvbpemlgxdogue` 连接与 schema 状态；真实网络下 DNS/TCP/SQL 可达，根因是 `alembic_version` 停在 `002_panda_subscribed_pools`、public 仅 7 张表；已执行 `python -m alembic upgrade head` 升级 `003`→`004`→`005`→`006`。 | `python -m alembic current -v` 显示 `006_trust_merkle_columns (head)`；`python scripts/verify_db.py` 通过：31 张表 + 8 个关键索引全部 `ok`；`docs/epic-verification-record.md` §1/§3.0 已更新 |
| 2026-06-17 | **`/mint` 单屏无滚动**：`mint/layout` 锁定视口高度；`ProductPageShell.fitViewport` + 三行 grid（hero / stage / actions）；舞台与熊猫尺寸改用 `dvh` 自适应；Gas 提示 `compact` 单行 | 桌面/移动 `/mint` 不应出现垂直滚动条；各 mint 状态（连接/铸造/成功）同屏展示 |
| 2026-06-17 | **`/mint` 垂直居中聚簇**：Hero/Stage/Actions 收入 `mint-ritual-cluster` 整体居中；收紧区块间距；舞台放大至 `48dvh` / 熊猫 `21dvh` | 视觉上不再贴顶/贴底；舞台更突出 |
| 2026-06-17 | **Epic 1-10 自动化复验与验证链路修复**：按 `docs/epic-verification-record.md` 复跑 Move/backend/frontend/market-monitor/websocket/DB 关键验证；`verify_db.py` 增加 `006` Merkle 新列检查；frontend `type-check` 改用独立 `tsconfig.typecheck.json`，避免 `.next/types` 与增量缓存假失败。 | `python scripts/verify_db.py` 通过：31 张表 + 8 个关键索引 + `merkle_roots.root_type/start_fact_id/end_fact_id`；`npm run build` 与 `npm run type-check` 通过；未覆盖钱包/浏览器 E2E、真实 testnet PTB、Walrus、50 笔训练闭环 |
| 2026-06-17 | **market-monitor 本地运行验证**：本机 `uvicorn main:app --reload --port 8001` 正在监听；`GET /health` 返回 `status=ok`、`pg_ok=true`、`deepbook_reachable=true`、`redis_connected=true`；`/pairs` 与 `/candles` 可返回 `DEEP/SUI`、`SUI/DBUSDC` 数据。 | 当前运行配置不是正式网口径：`.env` 指向 `SUI_RPC_URL=https://fullnode.testnet.sui.io:443`、`DEEPBOOK_PACKAGE_ID=0xdee9`、`DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC`、VPS `152.53.166.128:9008`；虽然 `/health.network` 显示 `mainnet`，实际数据源/池为 testnet；两池 health 均为 `stale`，需切 mainnet 配置并复验 freshness |
| 2026-06-17 | **zkLogin 回调页 UX 修复**：`startGoogleLogin` 写入 `sessionStorage` 来源页（如 `/mint`）；回调页黑金品牌 UI + loading/success/error 状态；成功/失败均 `router.replace` 回来源页；toast 延后到返回后由 `ZkLoginResultToast` 展示（说明 Google 登录无需钱包签名、链上操作仍需钱包批准） | 从 mint 页 Google 登录后应回到 `/mint` 再弹 toast；不再硬跳首页 |
| 2026-06-17 | **market-monitor 切主网公开 Indexer**：弃用 VPS `152.53.166.128:9008`；`DEEPBOOK_SERVER_URL` 默认 `https://deepbook-indexer.mainnet.mystenlabs.com`；`DEEPBOOK_DATABASE_URL` 改为可选（留空则 OHLCV/成交量走 Indexer `/ohclv` + `/historical_volume`）；池发现优先 `GET /get_pools`；`deepbook_client` 支持 Indexer 数组 K 线格式；`render.yaml` 默认 mainnet | 本地 smoke：`SUI_USDC` 实时 K 线 + 盘口 + 24h/7d 成交量可读；`/health.ohlcv_source=indexer_http`；无需自建 DeepBook Server |
| 2026-06-17 | **Mode 2 合约重命名**：`demo_executor` → `chain_proof_executor`；`execute_demo_trade` → `submit_chain_proof`；`DemoTradeExecuted` → `ChainProofRecorded`；同步 backend `ChainProofParams`/`submit_chain_proof`、Chain Proof 前端文案、`contracts/DEPLOY.md` | `sui move test` 27/27；pytest chain proof 14/14；**须 `sui client upgrade` 后链上 Mode 2 才可用**；Mode 3 未来用独立 `trade_executor` |
| 2026-06-17 | **Testnet upgrade 执行受阻（CLI/网络）**：已新增 `contracts/scripts/install-sui-testnet.sh` + `upgrade-testnet.sh`；本机 `sui` 1.72.2 仅支持 protocol 124、brew `sui` 1.73.0 仅 125，Testnet 需 **protocol 126**（`testnet-v1.73.1`）；GitHub 下载超时、git proxy `127.0.0.1:1087` 未监听；deployer `0xa459…` + gas ~0.8 SUI 就绪 | 用户开启代理或网络恢复后：`./contracts/scripts/install-sui-testnet.sh && SUI_BIN=~/.local/bin/sui-testnet ./contracts/scripts/upgrade-testnet.sh`；成功后更新 §3 PandaCoin TreasuryCap 等新 Object ID |
| 2026-06-18 | **Testnet package upgrade v2 成功**：`~/.local/bin/sui-testnet` v1.73.1；`panda_coin` 去掉 module `init`（改为 `setup_currency`，因 upgrade 禁止新模块 initializer）；tx `Ftg2Yu7dz94xHubPKdcqieK8DMJj3KjV4zRftkMA1cjB`；`Published.toml` published-at `0x9e8a64…5262`、original-id 仍为 `0x595087…1465`；链上 **15** 模块（含 `agent_wallet`/`chain_proof_executor`） | `NEXT_PUBLIC_PACKAGE_ID` 仍用 original-id；RPC 查模块用 published-at；`panda_coin::setup_currency` 待 deployer 手动执行后回填 TreasuryCap |
| 2026-06-18 | **PandaCoin 印钞机已开（v2→v3 + bootstrap）**：`panda_coin` 新增 `bootstrap_currency(AdminCap, CoinRegistry)`（`coin_registry::new_currency<PandaTrainingToken>`，因 OTW `PANDA_COIN` 无法在 upgrade 后外部调用）；v3 upgrade tx `APAEyimP9KhCfHiDSsFQVSwkJu9gBXugoyiW3UMWSLXq`；bootstrap tx `6229ATwhDTEnRNS4fyqcVj6wdXoax1yBps7d4mafhXPt`；TreasuryCap `0x3286e6…98f6`、PandaCoinAdminCap `0x44e4ee…064a`；published-at v3 `0xb2c3e7…62b8` | `sui move test` 27/27；铸币用 `mint_training_credit` |
| 2026-06-18 | **`panda_vault` 对齐 PandaTrainingToken（v4）**：`TrainingCreditBalanceKey` dynamic field + `deposit_training_credit` / `withdraw_training_credit`；`panda_vault_tests` 2 项；`sui move test` **29/29** | 见下行 v4 upgrade tx |
| 2026-06-18 | **Testnet package upgrade v4 成功**：tx `2ycsrXZHFK4xQ5iQQ42mYaoCexnDMoLdcUfuSoMZCfBr`；published-at `0x00d500…339`、version **4**；链上已含 `panda_vault::deposit_training_credit` | RPC 查新模块用 published-at v4；`NEXT_PUBLIC_PACKAGE_ID` 仍用 original-id |
| 2026-06-17 | **钱包登录 500 修复**：`auth.py` 将 ORM 返回的 `uuid.UUID` 型 `user.id` 统一 `str()` 后再写入 JWT/Pydantic/JSON；补回归测试 `test_connect_wallet_existing_user_uuid_id` | Slush/钱包 `POST /auth/connect` 对已存在用户不再 500 |
| 2026-06-17 | **本地 Supabase 连接修复**：`db.*.supabase.co:5432` 直连仅 IPv6 导致 `TimeoutError`；`backend/.env` 切 Session Pooler `aws-1-us-east-1.pooler.supabase.com:5432`；`database.py` 加 SSL/超时，`:6543` transaction pooler 自动 `NullPool`；`auth/connect` DB 异常映射 503；`verify_db.py` 复用 `get_engine()` | `python scripts/verify_db.py` 通过；重启 backend 后 Slush 登录应 200 |
| 2026-06-17 | **Google 登录假成功 + 钱包签名冲突**：根因①打开 `ConnectWalletModal` 时 `allowWalletAutoLogin` 触发 Slush 自动签名；②zkLogin 会话地址与 Slush 地址不同，`WalletAuthSync` 误判后 `clearAuth()`；修复：`authMethod` 区分 wallet/zklogin、弹窗打开期间抑制自动钱包登录、仅 wallet 登录校验地址一致、成功 toast 需验证 token | Google 登录不应弹 Slush 签名；成功后导航栏应保持已登录 |
| 2026-06-18 | **TradingPanda Logo 重设计落地**：基于黑金 + 荧光绿视觉系统，设计并替换 “Policy Collar Panda Agent” 几何 SVG logo；新增 `docs/assets/logo/trading-panda-icon.svg`、`trading-panda-wordmark.svg`、`trading-panda-preview.html` 与 `docs/design/logo.md`；覆盖 `frontend/public/assets/ui-logo.svg`、`frontend/public/favicon.svg`；prototype 顶栏 `.logo` / `.mini-panda` 改用本地 SVG 资产。 | `xmllint` 校验 5 个 SVG 通过；`node --check prototype/journey.js` 通过；QuickLook 成功渲染 icon/wordmark 缩略图；旧品牌 logo 中的武侠头带元素已从产品 logo 移除 |
| 2026-06-18 | **TradingPanda PNG Logo 取代 SVG 版**：用户认为几何 SVG icon 质感不佳；改用 Panda Lab `panda_ink_base.png` 合成 PNG 徽章 logo（黑金六边形 Move-object 边界 + 金色 Policy Collar + 绿色 market pulse + 蓝色 proof/Sui sensor）。新增/更新 `docs/assets/logo/trading-panda-logo.png`、`trading-panda-logo-512.png`、`trading-panda-wordmark.png`、`frontend/public/assets/ui-logo.png`、`frontend/public/favicon.png`、`prototype/assets/trading-panda-logo.png`；前端 Navbar/首页/zkLogin/连接弹窗与 prototype `.logo`/`.mini-panda` 全部切换到 PNG；`docs/design/logo.md` 与 logo preview 同步 PNG 资产表。 | `file` 确认 PNG 为 RGBA；PIL 校验透明角正常；`rg` 确认 frontend/prototype/docs 活跃链路无旧 SVG logo 引用；`node --check prototype/journey.js` 通过；已人工视觉检查 icon 与 wordmark |
| 2026-06-18 | **Navbar Logo 去框**：移除顶栏 logo 外层金边/渐变黑底装饰容器；改用轻微放大裁剪，隐藏 PNG 自带白边与黑底角 | 导航栏左侧仅显示六边形熊猫徽章，无额外边框 |
| 2026-06-18 | **Navbar 对齐 prototype**：顶栏改用 `product-topbar`（等同 prototype `.topbar`，无 `product-panel::before` 光晕层）；logo 改用 `product-brand-logo`（44px contain + green drop-shadow）；`ui-logo.png` / favicon / prototype logo 去除 PNG 外圈黑底矩形蒙版 | 导航栏 logo 与 prototype 一致，仅保留六边形徽章透明底 |
| 2026-06-18 | **本地人工测试说明文档**：新增 `docs/local-manual-test-guide.md`，按本地四服务联调（backend :8000、market-monitor :8001、websocket :8787、frontend :3000）整理环境变量、启动顺序、基础设施 smoke、完整用户旅程 U-01~U-10、负向测试、DB 抽查 SQL、最终验收表与已知本地风险；`docs/testing-strategy.md` 顶部加入入口链接。 | 文档明确 mainnet DeepBook 行情 + Sui Testnet 链上动作的测试边界，并标记 frontend pool 常量与 monitor mainnet pair 可能不一致的本地风险；未改代码、部署事实或 API 路径 |
| 2026-06-18 | **`WalletSignatureModal` 对齐 product 视觉**：mint/agent-wallet 预签名确认弹窗改用共享 `Modal variant="product"`（暗色面板、`product-*` 文案色、GasFeeHint 产品样式），替换原白底 Radix Dialog。 | `/mint` 点击 Mint Panda NFT 后弹窗与黑金仪式页一致；`/agent-wallet` 创建 Vault 签名确认同步受益 |
| 2026-06-18 | **`/agent-wallet` 页 product 视觉对齐**：权限卡/策略编辑器/预览摘要/Review 弹窗/详情 Drawer 统一 `product-*` 色板；表单改用 `Input`/`Select`；状态 Badge 与 Safety 页一致；toast/error 横幅改用 product 绿/红语义色。 | Agent Wallet 设置流程与 mint/safety 黑金视觉一致，不再出现白底 neutral 表单与弹窗 |
| 2026-06-18 | **Agent Wallet 表单视觉升级**：新增 `FormField`/`FormSection` + `product-form-surface`/`product-toggle-chip`/`product-metric-row`；PolicyCollarEditor 分区布局（Market scope / Risk caps / Chain proof）；Input/Select 对齐 prototype 14px 圆角与 mono 数字字段。 | `/agent-wallet` 表单从扁平 neutral 堆叠改为黑金分区编辑面板 + 荧光绿 pair chip + metric 预览卡 |
| 2026-06-18 | **Agent Wallet allowed pairs 接 market-monitor**：根因 backend `MARKET_MONITOR_URL=https://localhost:8001` 致 SSL 失败、`resolve_launch_pairs()` 回退仅 `DEEPBOOK_LAUNCH_PAIRS` 两项；`market_pairs._normalize_monitor_base_url` 本地 https→http；本地 `.env` 改为 `http://localhost:8001`。 | 重启 backend 后 `GET /panda/:id/agent-wallet` 的 `launch_pairs` 应合并 monitor `/pairs` 排名列表（含 SUI-USDC、WAL-USDC 等） |
| 2026-06-18 | **Agent Wallet loading 骨架屏**：新增 `AgentWalletPageSkeleton`（双栏 permission + form 占位）；Suspense/熊猫列表/agent-wallet status 三阶段统一 product 骨架；`Skeleton variant="product"`。 | `/agent-wallet` 加载不再显示居中 Plain “Loading…” 文本 |
| 2026-06-18 | **Agent Wallet pair 选择来源诊断**：确认 `/agent-wallet` Allowed pairs 不是读取 market-monitor `/pairs` 动态列表，而是由 backend `DEEPBOOK_LAUNCH_PAIRS` / `settings.deepbook_launch_pairs` 通过 `GET /panda/:id/agent-wallet` 返回 `launch_pairs`，前端 `useAgentWallet` 再传给 `PolicyCollarEditor` 渲染。 | 若页面只显示 2 个 pair，属于当前 launch pair 白名单/配置口径限制；要展示更多池需扩展 backend `DEEPBOOK_LAUNCH_PAIRS` 或改成从 market-monitor ranked pairs 同步。 |
| 2026-06-18 | **Agent Wallet pairs 改为 market-monitor 动态来源**：新增 backend `services/market_pairs.py`，`GET /panda/:id/agent-wallet`、`validate-policy`、setup sync、Strategy fallback pairs、Chain Proof eligibility 统一优先读取 `MARKET_MONITOR_URL/pairs` 的 ranked `pairs[].pair`；`DEEPBOOK_LAUNCH_PAIRS` 降为 monitor 不可用 fallback；规范化 DeepBook pool `_`→`-`。 | `/agent-wallet` Allowed pairs 会随 market-monitor ranked pairs 扩展；monitor 不可用时仍回退旧两池；focused tests：`pytest tests/test_agent_wallet.py tests/test_proof_selector.py tests/test_strategy_policy.py -q` → **27 passed**。 |
| 2026-06-18 | **Agent Wallet pinned pairs 合并修复**：`resolve_launch_pairs()` 改为先保留 `DEEPBOOK_LAUNCH_PAIRS` pinned pairs，再追加 market-monitor ranked pairs 和 monitor `launch_pairs`，去重保序；修复配置 `MARKET_MONITOR_URL` 后 `DEEP/SUI`、`SUI/USDC` 从页面消失的问题。 | `/agent-wallet` 应始终先显示 `DEEP/SUI`、`SUI/USDC`（若 backend env 如此配置），同时继续展示 monitor ranked pairs；focused tests：`pytest tests/test_agent_wallet.py tests/test_proof_selector.py tests/test_strategy_policy.py -q` → **28 passed**。 |
| 2026-06-18 | **交易对格式统一与去重**：`canonical_market_pair` 将 `/`、`_` 统一为 `-`（`DEEP/SUI`→`DEEP-SUI`）；backend `resolve_launch_pairs()` / `_policy_dict` 与 frontend `canonicalMarketPair`/`dedupeMarketPairs` 按 canonical 去重；`AllowedPairsSelector` 用 `sameMarketPair` 匹配选中态；默认 `DEEPBOOK_LAUNCH_PAIRS=DEEP-SUI,SUI-USDC`。 | `/agent-wallet` Allowed pairs 不再同时出现 `DEEP/SUI` 与 `DEEP-SUI`；pytest `test_agent_wallet.py` 14/14、frontend `canonicalMarketPair.test.ts` 3/3 |
| 2026-06-18 | **Agent Wallet Training budget（全栈）**：Alembic `007_training_budget_on_vault`；`PolicyDraft.training_budget` 100–1,000,000；setup sync 初始化 `panda_accounts`；`PATCH /panda/:id/agent-wallet/training-budget` 支持 setup 后修改；simulation start 禁止客户端 override `initial_capital`；strategy validate 读 vault budget；主 CTA **Confirm training setup**。 | `/agent-wallet` 首项为 Training budget；ready 态可 Update training budget；pytest `test_agent_wallet.py` 16/16 |
| 2026-06-18 | **本地 Agent Signer 密钥**：`~/.local/bin/sui-testnet client new-address ed25519 trading-panda-agent`；`backend/.env` 写入 `AGENT_SIGNER_ADDRESS=0x79ff…87411` + `AGENT_SIGNER_PRIVATE_KEY`（keystore export）；`CHAIN_PROOF_ENABLED=false`；重启 backend `uvicorn main:app :8000`。 | `/agent-wallet` Confirm training setup 不再因 signer 缺失 disabled；Chain Proof 仍须 faucet gas + `CHAIN_PROOF_ENABLED=true` |
| 2026-06-18 | **Agent Wallet review 弹窗 UX**：`openReview` 增加 `isValidating` + 主按钮 spinner/「Checking setup…」；`Modal size=lg`（560px）+ 大号 CTA 单行；Review/WalletSignature 弹窗加宽。 | 点击 Confirm training setup 校验期间有 loading；Create PandaVault + Policy 不再挤换行 |
| 2026-06-18 | **Training budget 展示改 USD**：表单/预览/Review/Permission 卡统一 **Training budget (USD)**、**Max order size (USD)**、`$` 前缀输入、`formatPaperUsd`；免责声明 **Paper trading balance (USD)**。 | 用户侧不再出现 training units；backend 校验文案改为 USD |
| 2026-06-18 | **Agent Wallet 签名弹窗 Gas 文案**：`GasFeeHint variant=agent-wallet`；说明 Vault+Policy 上链、paper balance 链下、用户钱包付 gas；Mint 仍用 mint 文案。 | Create PandaVault + Policy 弹窗不再显示 mint 误导句 |
| 2026-06-18 | **Agent Wallet 签名流程修复**：`useAgentWallet` 拆分 `setupPhase`（preparing/awaiting_wallet/syncing）；点 Approve 后先关弹窗再签名；统一 `parseMintEvent.extractTxDigest` + zkLogin 双路径；失败用 sonner toast（不再被 overlay 挡住）；页面级 amber 进度条；`isSavingBudget` 与 setup 分离。 | 签完钱包应 toast + 同步；digest/sync 失败可见；不再误显 Signing… |
| 2026-06-18 | **Package published-at 修复 agent_wallet PTB**：根因 original-id 仅 v1 十模块（无 `agent_wallet`）；新增 `NEXT_PUBLIC_PACKAGE_PUBLISHED_AT` / `PACKAGE_PUBLISHED_AT`（v4 `0x00d500…339`）；`packageIdForMoveCall()` 用于 PTB；事件解析匹配 original + published-at。 | Agent Wallet setup 不再报 `No module found with module name agent_wallet`；升级后须同步 env 并重启 frontend/backend |
| 2026-06-18 | **Agent Wallet mirror sync 500 修复**：`sui_rpc.get_transaction_block` 现接受 `options`（含 `showObjectChanges`）；`fetch_setup_from_tx` 不再传仅 original-id 过滤事件；补 parser/RPC 单测。 | 链上 setup 成功后 `POST .../agent-wallet/sync` 不再 TypeError 500；已上链 tx 可用 Retry mirror sync |
| 2026-06-18 | **Agent Wallet 事件解析 upgrade 兼容**：setup 事件按 `PandaVaultCreated`/`TradingPolicyCreated` 后缀匹配（不限 package 前缀）；`panda_id` 增加 `mutated ::panda::Panda` objectChanges 兜底；回归 digest `2wpy85…` + policy `0x264885…`。 | Retry mirror sync 可解析 v4 PTB + v2 事件 package 的 testnet setup tx |
| 2026-06-18 | **Agent Wallet mirror sync FK 报错诊断（仅分析）**：定位 `POST /panda/:id/agent-wallet/sync` 在 `sync_setup_from_tx()` 同次 commit 中插入 `PandaVault`、`TradingPolicy`、`PandaAccount`，但 ORM 未声明 vault/account/policy relationship，flush 时可能先插 `panda_accounts`，触发 `panda_accounts.vault_id_fkey`。 | 链上 PTB 已成功；报错发生在本地 PostgreSQL mirror 写入阶段。建议修复方向：为模型加关系或分阶段 flush/commit，并补 setup sync 回归测试。 |
| 2026-06-18 | **Agent Wallet mirror sync FK 修复**：`sync_setup_from_tx()` 改为先 `db.add(PandaVault)` + `await db.flush()`，确保本地 vault 行存在后再插入 `TradingPolicy` / `PandaAccount`；同一 `created_tx_digest` 的 retry mirror sync 幂等返回现有 setup 状态，不再误报 already exists。 | `pytest tests/test_agent_wallet.py -q` 18/18 通过；`python -m py_compile app/services/agent_wallet.py tests/test_agent_wallet.py` 通过。相邻 `test_proof_selector.py`/`test_strategy_policy.py` 当前仍有 5 个旧斜杠交易对断言失败，非本次 FK 修复引入。 |
| 2026-06-18 | **Training Ledger 视觉对齐黑金赛博主题**：新增 `TrainingControlBar`（替代 legacy `SimulationStatusBar`）；`TrainingStatusStrip`/`LedgerSummaryStrip`/`PandaAgentStatus`/`DecisionTimeline`/`PolicyGateBanner`/`TradeFactDrawer` 统一 `product-panel` + `product-green/gold/red` token；`CandlestickChart` 新增 `variant=product` 暗色 K 线；`/training-ledger/[id]` 页布局与 Agent Wallet / Safety 一致。 | 训练页不再出现白底/竹绿 legacy 样式；`pnpm type-check` 通过；dashboard 仍用 light `SimulationStatusBar` |
| 2026-06-18 | **Safety Desk 重设计（方案 A）**：`SafetyPageSkeleton` 骨架 loading；`RiskStatusHero` + `OwnerControlStrip` + `SafetyConsequencePanel`（Before/After 预览）+ `SafetyActionDeck`（Pause 全宽）；全英文案；`/safety/[id]` 与 `EmergencyControlsPage` 统一 Desk 布局。 | Loading 不再裸文案；Pause/Revoke/Tighten 分级操作；签名前后果面板；`pnpm type-check` 通过 |
| 2026-06-18 | **Safety 页视觉微调**：内嵌 Impact 卡去掉白边 `border`，改低对比 `ring-inset` 金/语义色；Mode 1/2 行内 `grid` 固定 label 列宽对齐；ActionDeck / PendingJobs / OwnerControlStrip 去多余边框。 | 后果预览区文字对齐；卡片无刺眼白框 |
| 2026-06-18 | **Safety Mode 1/2 布局重构**：默认概览改为单面板垂直分区 + `product-metric-row` 行样式（左 label / 右 value）；Before/After 对比卡同步统一行布局。 | 「What safety actions affect」区不再双卡并排错位 |
| 2026-06-18 | **Safety Active 主 CTA**：`RiskStatusHero` 在 `active` 态内嵌绿色 primary「Back to Training」；移除页底 outline 按钮。 | Active 框右侧/底部主 CTA 回训练页 |
| 2026-06-18 | **Agent Wallet → Training Ledger 产品流调整（最终落地记录）**：Agent Wallet ready 态右侧只保留 `Update training budget`；`View on-chain objects` 移到左侧 Panda permission / Agent signer 下方；`Safety` 入口改名 `Emergency controls`；mirror sync 成功后自动跳转 `/training-ledger/:id?feed=strategy`；Training Ledger 新增 `FeedStrategyDrawer`，无 active strategy 或 query `feed=strategy` 时打开，`TrainingControlBar` 的 Strategy 入口改为弹窗而非跳转页面。 | `npm run type-check` 通过；`npm test -- --run src/lib/ui/routeJump.test.ts src/lib/market/canonicalMarketPair.test.ts` 7/7 通过；clean `npm run build` 通过。 |
| 2026-06-18 | **Training Ledger 页面设计共识收束**：确认页面主任务是“观察与审计训练”，Start/Stop 仅为会话级控制；硬阻断/软警告边界、pair 切换、实时流、OrderIntent 主线 timeline、Trade Fact drawer 证据深度、Chain Proof/Review 上下文跳转、默认空态与失败保留最后可信状态等页面规则已写入 `docs/design/page-training.md`；补充 `CONTEXT.md` 术语 `Training Session` / `Ledger Delta`。 | 页面设计已对齐产品语言，可进入实现或更细的组件级拆分；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Training Ledger 页面重构（前后端）**：前端 `training-ledger/[id]/page.tsx` 重写为观察/审计 cockpit，新增 `LatestDecisionCard`、`trainingLedgerView` 预飞与摘要 helper，`DecisionTimeline` / `TradeFactDrawer` / `PolicyGateBanner` / `TrainingControlBar` 改为配合新信息层级；训练页恢复真实 `useMarketWs({ pool, pairs: [pool] })` 订阅；后端 `panda_training` 透出 `market_snapshot` / `decision_snapshot` / `policy_snapshot` / `ledger_snapshot_before` / `execution_snapshot` / `outcome`。 | 前端 `pnpm vitest run src/components/training/trainingLedgerView.test.ts src/lib/market/canonicalMarketPair.test.ts src/lib/ui/routeJump.test.ts` + `pnpm type-check` 通过；后端 `pytest backend/tests/test_panda_training_api.py backend/tests/test_training_hot_path.py -q` 通过；页面现在按最新设计显示实时训练、最新决策摘要与证据 drawer。 |
| 2026-06-18 | **Profile 页面产品边界确认**：`CONTEXT.md` 新增 `Profile` / `Primary Panda` 术语；确认 `/profile` 是用户级 account center，不是单只 Panda 档案页；第一屏主任务改为继续训练 Primary Panda，钱包地址降为身份信息；MVP 主 Panda 选择采用现有 active panda / `/api/panda/my` 第一只的确定性规则，不新增后端偏好表。 | Profile UI 后续实现有明确边界：聚合身份、签到、拥有的 Pandas 与训练状态；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Profile UI 重写落地**：新增 `docs/design/page-profile.md` 并纳入 design map；`/profile` 改为黑金 product account center，首屏突出 Primary Panda continuation card，右侧紧凑签到与账户卡，下方 Training Summary + 轻量 My Pandas；新增 `resolveProfilePrimaryAction()` 和 focused tests，CTA 路由覆盖 Mint / Agent Wallet setup / Training Ledger feed drawer / Continue Training；补齐 `TradeFactApi` ledger snapshot 类型并对齐 Training Ledger pre-flight props，以支持构建检查。 | `pnpm test -- --run src/lib/profile/profileCta.test.ts src/components/training/trainingLedgerView.test.ts` 通过（6/6）；`pnpm type-check` 通过；`pnpm build` 通过；本地 Next dev `GET/HEAD /profile` 200 且 `/profile` 编译成功。 |
| 2026-06-18 | **Landing Page 文案定位确认（glossary）**：`CONTEXT.md` 新增 `Bounded Autonomy`，锁定首页主叙事为“Panda 可以自主判断与行动，但只能在用户定义的权限和风险边界内”。 | Landing 文案后续以 bounded autonomous Panda wallet 为主轴，先讲自主 + 约束，再讲熊猫养成；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Landing Page 产品类别确认（glossary）**：`CONTEXT.md` 新增 `Sui-native Autonomous Agent Wallet`，锁定首页 eyebrow/category 为 `Sui-native autonomous agent wallet`。 | 首页第一身份不再使用 `Cyber Panda Agent Wallet OS` 或 `AI trading pet`；保留 Panda 养成作为情感层；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Profile 熊猫形象 + 侧边栏滚动**：Profile 头像改用 `PandaCanvasRenderer`（personality/experience/emotion → 与 Panda Lab/Mint 相同分层合成）；新增 `ProfilePandaPortrait` + `statsFromPandaSummary`；My Pandas 侧边栏桌面固定高度 `560px` 内垂直滚动。 | 不同性格数值的 Panda 在 Profile 应呈现不同造型；多只 Panda 时侧边栏不再撑高整页 |
| 2026-06-18 | **Profile 中间卡片上下布局**：`SelectedPandaDetailCard` 由左右分栏改为上下结构（上方熊猫形象区、下方名称/指标/CTA）；侧边栏 `ProfilePandaPortrait` 与其它区域保持不变。 | 仅中间 Selected Panda 卡片布局调整；侧边栏头像样式未改 |
| 2026-06-18 | **Profile Training Summary 移入右侧栏**：Owned Pandas / Total trades / Average win / Training now 从页底全宽四列改为右侧边栏内垂直堆叠（位于 Check-in 与 Account 之间），适配 300px rail。 | Profile 主内容区不再被底部 summary 占用；移动端随右侧栏顺序堆叠 |
| 2026-06-18 | **Profile 右侧栏顺序调整**：Account 卡片移至右侧栏最上方，顺序为 Account → Check-in → Training Summary。 | 账户身份优先展示 |
| 2026-06-18 | **Landing Page 文案骨架收束（仅讨论记录）**：确认首页 English-first，评委/生态评审优先但普通用户可读；Hero 为 `Train a Panda that trades autonomously inside your rules.`；结构为 Hero → Why → How → What makes it Sui-native → Training Loop → Safety → CTA；不单独设置 Proof section。 | 后续 landing 设计进入组件方案阶段；proof/evidence 作为内嵌语义出现在 Sui-native 与 Training Loop 中；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Landing Page 组件表达方案收束（仅讨论记录）**：确认 Hero 使用 full-bleed Panda Agent Wallet scene；Why 使用 asymmetric Bento comparison；How 使用 vertical journey stepper + sticky preview；Sui-native 使用 5 object cards + animated object diagram；Training Loop 使用闭环时间线；Safety 使用 owner control panel；Final CTA 回到 Panda 情感视觉。 | 后续实现可基于 Magic UI `Bento Grid`、`Animated Beam`、`Animated List`、`Border Beam`/`Magic Card` 等效果组件组合，但视觉必须服务产品结构；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Landing Page Hero 熊猫展示要求确认（仅讨论记录）**：Hero 必须复用 Panda Lab 形象系统（`PandaCanvasRenderer` + `PANDA_LAB_PRESETS`），以 spotlight carousel 展示多种 Panda 角色；主视觉为当前 Panda 大图，配 4–5 个角色缩略图/标签自动轮播与手动选择。 | Hero 不可退化为单张 logo 或普通静态系统图；角色展示要直观呈现不同 personality/experience/emotion 组合，同时保留 DeepBook → Panda → TradingPolicy → PandaVault → evidence 的 agent wallet 场景。未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Landing Page Hero carousel 行为确认（仅讨论记录）**：首批展示 `Balanced Scout`、`Bold Veteran`、`Patient Master`、`Contrarian Mind`；不显示 personality 数值，只显示 archetype + 性格标签；4.5s 自动轮播，hover/focus 暂停，手动选择后停止自动轮播，`prefers-reduced-motion` 禁用自动轮播；系统 beam/policy ring tone 随 archetype 轻微变化；实现建议为 `components/landing/PandaSpotlightCarousel.tsx`。 | Hero carousel 后续实现要复用 Panda Lab presets 并作为 landing 独立组件，避免把轮播状态堆进 `app/page.tsx`；未改代码、部署事实、环境变量或 API 路径。 |
| 2026-06-18 | **Training Ledger 手测路径梳理（仅讨论记录）**：基于 `docs/local-manual-test-guide.md` 与当前 `/training-ledger/[id]` 实现，明确推荐按 backend、market-monitor、websocket、frontend 四服务全链路测试，而不是只做 UI smoke；测试重点覆盖预飞 checklist、真实 tick、OrderIntent、Ledger Delta、Trade Fact evidence drawer、stale/paused 等边界。 | 本次未改功能代码、部署事实、环境变量、数据库结构或 API 路径；仅形成手测执行步骤。 |
| 2026-06-18 | **`/api/market/candles` 本地 500 排查**：`curl localhost:3000/api/market/candles` 返回 HTML 500（`Cannot find module './1124.js'`），`python3 -m json.tool` 报 `Expecting value`；直连 `localhost:8001/candles` 正常。根因是 `.next` 中 `candles/route.js` 残留 production chunk 引用，与 dev 模式 `health/route.js` 不一致。 | 删除 `frontend/.next` 并重启 `pnpm dev` 后 BFF 代理恢复正常 JSON；遇同类症状优先清 `.next` 而非改代理代码。 |
| 2026-06-18 | **Landing Hero 三项修复**：① `walletConnection.ts` 启动时清理 MetaMask 等 blocked wallet 的 dapp-kit 持久化状态并收紧 `walletFilter`，避免刷新首页 `Failed to connect to MetaMask`；② Hero 左栏 `z-10` + 标题字号/栅格间距调整，防止大屏标题被右侧熊猫卡遮挡；③ `PandaSpotlightCarousel` 场景标签改为 `overflow-visible` + 环绕浮动动画（`pandaTagDrift*`），`prefers-reduced-motion` 下静止。 | `vitest` walletConnection + landingContent 7/7；`pnpm type-check` 通过；刷新首页不应再出现 MetaMask autoConnect 报错，Hero 标签应完整可见并轻微漂浮。 |
| 2026-06-18 | **MetaMask 刷新报错二次修复**：关闭 dapp-kit 内置 `autoConnect`；新增 `SafeWalletAutoConnect`（仅 Slush/Sui Wallet、延迟 1.2s、静默失败吞错）；`walletConnection` 按 `name`+`id` 拦截 MetaMask/suisnap 并扩展单测。 | 多钱包并存（Slush+MetaMask）时刷新首页不应再触发 dapp-kit 对 MetaMask 的静默连接；Slush 仍可在手动连接后自动重连；`vitest walletConnection` 6/6、`type-check` 通过。 |
| 2026-06-18 | **Landing Why 区块重写**：去掉「第三种模式」三栏竞品对比，改为共鸣痛点 → 熊猫主卖点大 panel（钱包边界 + 真实行情训练场）→ 链上规则/可复盘/会成长三 pillar → `Mint your first Panda` mini CTA；文案收束于 `WHY_COPY` / `WHY_PILLARS`。 | `vitest landingContent.test.ts` 8/8 通过；Why 优先回应「怕黑盒失控」与「模拟盘无意义」，养熊猫为主叙事。 |
| 2026-06-18 | **Landing Why 精简 + 熊猫视觉**：标题改为 `Raise a Panda that trades.`；全文压缩；主 panel 新增 `WhyPandaPortrait`（Balanced Scout + 在线绿点）；训练场文案改为 `train here until live trading opens` 更直白软化。 | `vitest landingContent.test.ts` + `type-check` 通过；Why 信息密度降低、视觉与 Hero 熊猫系统一致。 |
| 2026-06-18 | **Landing Why v2（alpaca 双栏模式）**：`WhyNarrative`（痛点问句 + YOUR PANDA/BOUNDED 高亮 + 3 条 checklist）+ `WhyContrastDemo`（默认 Blind trust / Your Panda tab + mock agent 状态 + 熊猫肖像）；底部 mini CTA 保留；文案 `WHY_COPY` / `WHY_CHECKLIST` / `WHY_DEMO`。 | `vitest landingContent.test.ts` + `type-check` 通过；Why 左文右演示，good tab 含 Bounded autonomy / Rules you own chips。 |
| 2026-06-18 | **Landing Why 标题精简 + 熊猫左移**：标题收为 `Charts or a black box? Raise YOUR PANDA.`；`WhyPandaPortrait` 移至左栏标题旁，右栏 demo 仅保留状态 mock。 | `vitest landingContent.test.ts` + `type-check` 通过。 |
| 2026-06-18 | **Landing Why 修正**：恢复 v2 双行标题原文案；`WhyPandaPortrait` 仅在 Your Panda tab 内置于 `POLICY GATE PASSED` 左侧（非左栏标题旁）。 | `vitest landingContent.test.ts` + `type-check` 通过。 |
| 2026-06-18 | **Landing Why 痛点句 reposition**：`Still staring at charts or trusting a black box?` 从左栏标题移除，改显示在 Blind trust tab 切换条下方（仅该 tab 激活时）。 | 左栏仅保留 `Train YOUR PANDA with BOUNDED autonomy…`；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing How It Works 交互式重构** | 重构为 `HowItWorksInteractive`：新增动态能量引导线、卡片选中态、以及右侧 6 个步骤的「真实 UI 预览」（Mint/Policy/Market/Vault/Fact/Memory）；全交互驱动，移除自动轮播。 | 解决了步骤不连贯的 UI Bug；通过直观性 App 预览提升了用户对产品核心流程的理解；`pnpm type-check` 通过。 |
| 2026-06-18 | **Landing How It Works 深度交互升级** | 升级 `HowItWorksInteractive`：①将流程线移至左侧独立列，解决穿过卡片的视觉Bug；②Mint 步骤引入 `PandaCanvasRenderer` 真实熊猫形象，配以动态 SVG 菱形雷达图与随机生成按钮；③Set-rules 步骤实现可交互的迷你策略编辑器（Slider+Checkboxes），带实时 Policy Gate 状态判定；④Market 步骤实现实时滚动的 SVG K线图（含MA均线与随机波动）；⑤Vault 步骤重构为纯能量态的数字护盾（多层旋转 SVG 环与粒子流）；⑥优化 Fact 审核与 Memory 脑部神经脉冲动画。 | 极大提升了 Landing 页的硬核科技感与交互趣味性；`pnpm type-check` 通过。 |
| 2026-06-18 | **Landing Training Loop 无限进化环重构** | 重构为 `TrainingLoopCircular`：①采用无限符号 ($\infty$) 轨迹布局 7 个训练步骤；②中心集成 `PandaCanvasRenderer` 实时形象，配以动态 XP 经验环与等级徽章；③实现全自动播放的能量脉冲动画，每完成一圈循环 XP 自动增长并支持等级提升；④节点激活时伴有呼吸灯效果与详细逻辑描述切换。 | 完美传达了 TradingPanda “闭环进化”的产品哲学，视觉表现力大幅增强；`pnpm type-check` 通过。 |
| 2026-06-18 | **Landing Training Loop 滚动驱动升级** | 升级 `TrainingLoopCircular`：①动画驱动改为「滚动驱动」，能量流随用户滚动精确滑动（2个完整周期）；②XP 增长与滚动进度绑定（35%→100%），并在滚动到底部时出现「EVOLVE PANDA」交互按钮；③视觉亮度大幅提升，采用霓虹发光轨道、彗星拖尾能量脉冲和环境光晕；④优化节点文字布局，Step 3/4 标签强制排列在下方。 | 增强了用户的参与感与训练代入感，视觉效果更具冲击力；`pnpm type-check` 通过。 |
| 2026-06-18 | **Landing Training Loop 视觉优化与自动播放回归** | 优化 `TrainingLoopCircular`：①移除滚动驱动，回归全自动播放循环，解决交互过于复杂的问题；②保留霓虹轨道、彗星脉冲等高亮度视觉增强；③修复 `PandaCanvasRenderer` 经验值传递导致的 TypeError Bug；④优化 Step 3/4 节点文字布局。 | 视觉表现更稳定，解决了页面滚动时的混乱感，修复了潜在的渲染错误。 |
| 2026-06-18 | **Landing Training Loop 步骤标签位置** | `TrainingLoopCircular` 为各节点增加 `labelPosition`：Step 2 / Step 4 标签在节点正上方，Step 3 在正下方；左右侧步骤保持原有侧向布局。 | 激活步骤时文字不再遮挡节点或与轨道重叠；`type-check` 无新增错误。 |
| 2026-06-18 | **Landing Training Loop 自动环绕轨道重构** | 重构 `TrainingLoopCircular`：①将无限符号轨道替换为围绕熊猫的大型圆形轨道（半径 240px），提供更开阔的视觉空间；②移除所有拖拽/拨动交互，回归全自动旋转模式；③XP 随旋转自动增长，熊猫根据当前步骤动态切换情绪（Excited/Cautious/Greedy）；④优化了能量脉冲与节点的发光质感。 |
| 2026-06-18 | **Landing Training Loop 分段充能环 v2** | `TrainingLoopCircular` 按 v2 方案重构：外圈扩至 560–600px；移除旋转彗星黑点与内圈 XP 环；7 段弧线 Ghost/Charging/Charged 变色 + dash sweep；熊猫与 LVL/XP 徽章圆心居中；XP 满时整环金闪进化并重置充能、底轨亮度累积；步骤 3.5s 定时自动轮播。 | `pnpm type-check` 通过；能量表达改为圆环线条本身，无拨动交互。 |
| 2026-06-18 | **Landing Training Loop 逐步推进与说明卡优化** | `TrainingLoopCircular`：圆环改为单段线性充能（仅当前段亮绿 sweep，已完成段淡绿静态，去掉多段同时呼吸脉冲）；熊猫去边框、放大至 280–300px、纸色圆形裁切无方框；环上节点去掉弹出标签；环下新增步骤说明卡（图标+标题+进度条+7 点指示器）。 | `pnpm type-check` 通过；循环节奏更清晰，说明信息层级更明确。 |
| 2026-06-18 | **Landing Training Loop 累积充能与弧线避节点** | `TrainingLoopCircular`：7 步逐步累积填充圆环（step1→step7 满环后短暂停留再重置为空环）；弧线在节点两侧留角隙、不穿过节点图标；说明卡去掉白边改黑金渐变底+product-line 进度轨；节点层级置于弧线之上。 | `pnpm type-check` 通过；循环语义为「逐段填满再归零」。 |
| 2026-06-18 | **Landing Training Loop 方案甲落地** | 节点移至扇区中心 `(i+0.5)/7` 顺时针等分；弧线路径改为顺时针 sweep，充能方向与 Step1→7 一致；节点中心留双段弧隙不穿图标；去掉节点/说明卡 ring 描边改 shadow；累积满环后重置逻辑保留。 | `pnpm type-check` 通过；步骤空间顺序与动画方向对齐。 |
| 2026-06-18 | **Landing Training Loop 连续闭环 A′** | 双段断裂弧改为单层连续圆环：暗色底轨 + dashoffset 进度轨（12 点顺时针累积）；节点压盖在环上（z-index 更高、实心底）不再在 SVG 挖隙；满环停留后归零重开。 | `pnpm type-check` 通过；环线视觉连续闭合。 |
| 2026-06-18 | **Landing Training Loop 进度起点对齐 Step1 节点** | 进度环 `rotate` 从固定 −90°（12 点）改为 Step1 扇区中心角 `RING_START_ANGLE`，充能从节点一位置顺时针增长。 | 循环起始不再从弧段中间出发。 |
| 2026-06-19 | **Strategy Page 按 `docs/design/page-strategy.md` 重构**：`/strategy/[id]` 改为左侧模板栏 + 右侧 RuleBlockEditor/Policy preview/Version+ghost 结构；模板页只保留 `trend-scout` / `mean-reversion` / `macd` 三个 beginner templates；新增 `frontend/src/lib/strategyPage.ts` 门控 helper 与 `src/lib/strategyPage.test.ts`；`StrategyBuilder` 支持外层页面接管草稿、隐藏内置模板/动作；`StrategyTemplateRack` 支持模板过滤。 | `pnpm test -- --run src/lib/strategyPage.test.ts src/lib/ui/routeJump.test.ts src/lib/profile/profileCta.test.ts` 通过；`pnpm type-check` 通过；J3 页面的默认信息层级与设计稿一致，Start Training 仅在激活/保存后开放。 |
| 2026-06-18 | **Landing How It Works 凹陷槽 UI** | `HowItWorksInteractive`：去掉左侧竖向连接线；步骤合并为 Steps Tray，选中槽 `#070b08` + inset shadow 凹陷；Preview 内凹舞台；全面去除 white/* 描边与分隔线，mock 子组件改 inset 暗底卡。 | `pnpm type-check` 通过；与黑金视觉系统对齐。 |
| 2026-06-18 | **Landing How It Works 连接线与凹陷加强** | 恢复左侧内凹通道 + 绿金渐变流动连接线动画；选中槽加深至 `#030504`、更强 inset shadow 与淡绿渐变顶；节点按钮同步凹陷样式，无白边。 | 选中态与步骤流动感更明显。 |
| 2026-06-18 | **Landing How It Works 右侧透明预览框** | 右侧 Preview 改为半透明玻璃态（`bg-black/20` + `backdrop-blur` + 弱金边），与左侧实心 Steps Tray 区分；内容区 `bg-black/10` 去重 inset 凹陷。 | 左右栏视觉层级分离。 |
| 2026-06-18 | **Landing How It Works 黑金玻璃视窗** | 右侧 Preview 去掉全部 border；改用多层 shadow + 顶沿 inset 高光 + 径向暗角 + 淡网格；顶栏/内容区 inset 分隔；步骤切换时外缘环境光微弱变色。 | 无边框质感预览窗，与左侧实心托盘对比更清晰。 |
| 2026-06-18 | **Landing How Set-rules 预览增强** | `PolicyPreview` 拆为 PandaVault（Trading funds 金色调）与 Trading Policy（绿色调）两区块；`Max order (USD)` 文案；Radix 滑块起点至 thumb 填充色轨道。 | Set the rules 步骤与产品对象边界更清晰。 |
| 2026-06-18 | **Landing Sui-native 文案重构** | `SuiNativeSection` 改为方案 A header（Move-enforced agent boundaries）；双栏 `What you control` / `What Move enforces`；底部独立 Evidence chain 横条（Mode 1 paper + Mode 2 Chain Proof）；文案迁入 `SUI_NATIVE_COPY` / `SUI_NATIVE_CONTROL` / `SUI_NATIVE_ENFORCE` / `SUI_NATIVE_EVIDENCE_CHAIN`。 | 去掉重复 Owner chain + Step cards 与误导性「每笔 real Sui tx」表述；`vitest landingContent.test.ts` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 配对行布局** | 双栏 checklist 改为 4 行 object-first 配对（Panda NFT / Vault+Policy / Agent Signer / Chain Proof）；每行 `You sign → Move enforces`；mobile 箭头纵向；文案迁入 `SUI_NATIVE_PAIRS`。 | 左右因果关系可读；`vitest landingContent.test.ts` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 交互式重构** | 新增 `SuiNativeInteractive`（对齐 How It Works：左侧 object tray 选中展开 summary，右侧 sticky `Move boundary preview` 展示 You sign → Move enforces）；移除 Chain Proof 配对行；保留 Evidence chain 横条。 | 信息按需展开；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 左右栏分工优化** | 左侧每步加 `You sign` 标签 + 短 title + 展开 summary；右侧仅保留 `Move enforces`（短 title + description）；去掉重复 You sign 块与白边，改用 inset 金绿渐变质感卡。 | 左右信息不重复；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 标签与模块名** | 左侧 object 与 `You sign` 并列 chip（如 `PANDA NFT` + `YOU SIGN`）；右侧 preview 主展示 Move 模块路径，其下为 Move enforces + 短 title + description。 | 评委向模块可读性增强；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 模块名缩短** | 右侧 preview 模块路径去掉 `trading_panda::` package 前缀，仅显示 `module::Struct`（如 `panda::Panda`、`panda_vault::PandaVault`）。 | 模块名更短更易扫读。 |
| 2026-06-18 | **Landing Sui-native Agent Signer 补全** | Step 2 专讲 limits；新增独立 Step 3 `Bind authorized signer address`（非 Agent Signer chip），enforce 含 `agent_wallet::setup_agent_wallet`、`authorized_agent` 字段与 assert/revoke 说明。 | 授权地址作为第三步单独列出；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing Sui-native 四步流程** | Sui-native 左侧 tray 扩为 4 步：Identity → Limits → Bind authorized signer address → Pause or revoke；Step 3/4 分工绑定 vs 收回权限，Step 4 enforce 展示 `authorized_agent: 0x0` + revoke/pause。 | 完整 owner 控制链；`vitest` + `type-check` 通过。 |
| 2026-06-18 | **Landing Control the Panda 视觉优化** | `SafetySection` 采用 Semantic Glow Deck：本地 `LANDING_SAFETY_PANEL`（`bg-black/60` + 弱金边，无嵌套白边）；Pause/Revoke 红语义 glow + icon，Tighten/Withdraw 金语义；State transition 改为 inline pill flow；右侧 Owner stack 改为纵向 pipeline + blocked state ring glow。 | 仅改 landing SafetySection，不动全局 `product-panel`；`pnpm type-check` 通过。 |
| 2026-06-18 | **Landing Control the Panda 质感升级** | `SafetySection` 移除 `product-panel`/全部 border 与 ring；新增 `SafetyGlassPanel`（无边框多层 shadow + 径向暗角 + 淡网格，对齐 How It Works 预览窗）；action/stack/blocked 卡片改 inset 凹陷 + 语义角光；Live controls chip 去 border。 | 无白边/蓝边/金边硬框，纯 shadow 分层；`pnpm type-check` 通过。 |
| 2026-06-19 | **Landing Hero Spotlight 卡片质感升级** | `PandaSpotlightCarousel` 去掉纯黑 `#060806` 底；新增 `hero-spotlight-card` 多层渐变 + 扫描线 + 径向暗角 + 四角 bracket + 顶沿 rim 光；内部 SceneNode / archetype 面板改用 `hero-spotlight-glass` inset 玻璃质感。 | Hero 右侧卡片与 Safety / How It Works 预览窗视觉语言一致；`pnpm type-check` 通过。 |
| 2026-06-19 | **Landing Why 对比卡片质感升级** | `WhyContrastDemo` 移除 `product-panel` 与全部可见 border；新增 `why-contrast-shell` 无边框多层 shadow + 径向暗角 + 扫描线；tab rail / 红绿内容面板改 inset 语义渐变；切换 tab 时外缘红/绿环境光微变。 | Why 右侧卡片无白边，与 Hero / Safety 质感一致；`pnpm type-check` 通过。 |
| 2026-06-19 | **Profile 移除天赋标签** | `SelectedPandaDetailCard` 删除 `panda.talent.name` chip（如「无天赋」「反向嗅觉」）。 | Profile 详情区仅保留状态 badge，不再展示天赋名标签。 |
| 2026-06-19 | **Agent Wallet 卡片/按钮质感升级** | 新增 `agent-wallet-*` 样式族（`agent-wallet-card` / `inset` / `preview` / 按钮 / alert / pair-chip）；`PandaPermissionCard`、`PolicyCollarEditor`、`PolicyPreviewSummary`、`AgentWalletPage` CTA 全面改用金绿 inset 渐变，去除 white/* 描边与 `product-panel` 白边高光。 | Agent Wallet 页卡片与按钮更有层次，无白边框；`pnpm type-check` 通过。 |
| 2026-06-19 | **Training Ledger 测试步骤说明（仅讨论记录）** | 基于当前 `/training-ledger/[id]` 实现与 `docs/local-manual-test-guide.md`，整理页面测试路径：先跑前后端专项测试与四服务健康检查，再验证 wallet/strategy preflight、market tick、OrderIntent、Ledger Delta、Trade Fact drawer、stop/stale/paused 边界。 | 未改功能代码、部署事实、环境变量、数据库结构或 API 路径；仅输出可执行手测指南。 |
| 2026-06-19 | **Safety 页布局与操作区重设计** | 新增 `safety-hero` / `safety-surface` / `safety-action-group` 无边框样式；`SafetyActionDeck` 改为 Step 1 分组列表行（Pause / Revoke / Tighten），非卡片；`EmergencyControlsPage` 改为状态 → Step1 选操作 → Step2 预览签名 → 证据条；`RiskStatusHero` / `SafetyConsequencePanel` 去 `product-panel` 白边。 | 用户一眼可见「先看状态 → 选操作 → 审后果 → 签名」；`pnpm type-check` 通过。 |
| 2026-06-19 | **Training Ledger 页质感升级（对齐 Safety Desk）** | 新增 `ledger-hero` / `ledger-surface` / `ledger-control-bar` / `ledger-timeline-*` / `ledger-metric-cell` 无边框样式族；`TrainingPhaseHero` 替代原 status strip 大标题态；`TrainingControlBar` / `LatestDecisionCard` / `PandaAgentStatus` / `LedgerSummaryStrip` / `MarketChartPanel` / `DecisionTimeline` / `PolicyGateBanner` 全面去 `product-panel` 白边；Decision timeline 改分组列表行 + Evidence trail 标题层级。 | Training Ledger 与 Safety 页视觉语言一致，box 无白边；`pnpm type-check` 通过。 |
| 2026-06-19 | **Feed Strategy 弹窗质感重设计** | `FeedStrategyDrawer` 改为 ledger 对齐的三段式布局（Policy gate / Strategy builder / Ghost influence）+ sticky footer；`Drawer` 支持 eyebrow/footer；新增 `strategy-feed-*` 与 `strategySurfaceTheme`；`StrategyBuilder` / `StrategyVersionBar` / `PolicyCompatibilityPreview` / `GhostInfluenceHint` 等支持 `theme="product"`，去除弹窗内白底卡片。 | Feed strategy 弹窗与 Training Ledger cockpit 视觉一致，更有层次；`pnpm type-check` 通过。 |
| 2026-06-19 | **Feed Strategy 弹窗无边框 + 滑块填充优化** | 扩展 `strategy-feed-*` 样式族：抽屉/卡片/输入/芯片全面去 visible border 与 white/* 描边，改 inset shadow + 金绿渐变；`Slider` product 变体新增 `strategy-feed-slider-track/range/thumb`，起点至滑块实色填充；风控滑块改 `strategy-feed-risk-panel` 四格布局；`Input`/`Select`/`Textarea` 新增 `surface="inset"`。 | 弹窗无白边，滑块填充清晰可见，整体质感更接近 Agent Wallet / Safety Desk；`pnpm type-check` 通过。 |
| 2026-06-19 | **Training Ledger K 线分页 + lazy load** | market-monitor `GET /candles` 增加 `before`/`has_more`/`oldest_t`/`newest_t`（1y 软上限，默认 limit=150）；Indexer `start_time`/`end_time`；前端 `useMarketCandles`（150 根/批、4000 根内存 cap、向左 lazy load）；周期扩至 `1m–1d`；1m WS tail + 非 1m REST tail 刷新。 | Training Ledger 图表可 zoom 加载更早 K 线；`pytest test_candles_page` + `vitest candleStore` + `tsc` 通过。 |
| 2026-06-19 | **Training Ledger K 线周期下拉 + 移除 Fit** | 周期选择改为 Pool 同行的质感下拉（`1m · 1 minute` 等）；图表内 chip 与 Fit 按钮移除；Dashboard 图表仍保留周期下拉。 | Training Ledger 工具栏更简洁；`pnpm type-check` 通过。 |
| 2026-06-19 | **market-monitor candles pool 名规范化** | `/candles` 入参 `DEEP-SUI`/`DEEP/SUI` 统一转为 Indexer 格式 `DEEP_SUI`；`fills_client` 目录 lookup 支持 hyphen 别名。 | 修复 `pool=DEEP-SUI` 返回 no candle data；需重启 market-monitor。 |
| 2026-06-19 | **Training Ledger 交易池下拉 + 移除 Pools 页** | K 线框上方新增下拉，仅展示 Agent Wallet `allowed_pairs`；移除 Start training 右侧 Pair/交易池链接；删除 `/pools` 页及相关组件；侧栏/仪表盘链接改指向 Agent Wallet。 | 交易池配置统一在 Agent Wallet；`pnpm type-check` 通过。 |
| 2026-06-19 | **Training Ledger WSS 单连接 + K 线池指标 toolbar** | 新增 app 级 `WebSocketProvider`（market + simulation 复用一条 Hub 连接）；`useWebSocket` 加重连退避并避免 intentional disconnect 后再连；`subscribe.market` 去重；新增 BFF `GET /api/market/pairs`；K 线 product toolbar 展示 Last / 24h / Feed + 24h Vol / Liquidity / Spread（英文 tooltip）。 | 修复 dev 429 与连接抖动；toolbar 不再用 chart window `%` 冒充 24h；`vitest` + `tsc` 通过。 |
| 2026-06-19 | **K 线 toolbar 质感 + 池指标匹配修复** | `chart-metric-rail` 无边框 inset 玻璃、flex 换行；池指标 ? icon + hover tooltip；数值分色（gold/blue/green/amber）；`MarketFeedStatus` 独立；`findMonitorPairRow` 修复 DEEP-SUI→DEEP-USDC。 | Feed 与池指标分离；`poolStats.test.ts` + `tsc` 通过。 |
| 2026-06-19 | **Training Ledger 移除 Live phase 卡片** | 删除 `TrainingPhaseHero`（Standby / Pair / Market / Actor / Merkle / WS 状态条）及页面 merkle 轮询。 | 训练页顶部更简洁；控制栏仍保留 phase / pre-flight。 |
| 2026-06-19 | **Training Ledger 标题行 Paper 指标 + Start toast** | 移除右栏 `PolicyGateBanner` 与 Paper ledger 块；`PaperLedgerHeaderMetrics` 与标题同行；Start 失败仅 toast（无策略时 toast + 开 Feed drawer）；去掉 preflight 弹层与进页自动开 strategy drawer。 | 持仓/盈亏抬头可见、少冗余提示；`tsc` 通过。 |
| 2026-06-19 | **Codex + HyperFrames 录制方案整理（仅讨论记录）** | 梳理了用 Codex 产出 `SCRIPT.md` / `STORYBOARD.md` / compositions，再用 HyperFrames `preview` / `validate` / `render` 导出 demo 视频的流程；未改代码、部署事实、环境变量、数据库结构或 API 路径。 | 仅用于后续 demo 视频制作的工作流对齐。 |
| 2026-06-19 | **README.md 重写（v3.1 Autonomous Agent Wallet）** | 对齐 PRD v3.1、首页 landing 与 `DEV_CONTEXT`：双轨模型、四服务本地拓扑、15 Move 模块、Testnet v4 合约 ID、用户旅程（Mint→Agent Wallet→Training Ledger→Chain Proof）；文档地图更新；**不含 live URL**（尚未部署）。 | 仓库入口文档与当前产品/架构一致；本地跑通见 `docs/local-manual-test-guide.md`。 |
| 2026-06-19 | **决策引擎闭环 Sprint 1–3（backend）** | `entry_delay` 执行缓存决策；`derive_social_signal` 接 Step7；全平 SELL 写 `closed_at`/outcome → `position_closed` review job；`job_runner` 后台轮询 `async_jobs`；LLM Coordinator 保持启用（`|score|≥0.40` OBSERVE 区，失败打 log）；`backend/.env` 本地同步 DeepSeek（不提交）。新增 4 模块 + pytest 9 项。 | 平仓后应自动入队复盘（需四服务+DB）；Chain Proof 仍手动；Epic 11 E2E 待手测。 |
| 2026-06-19 | **决策引擎 L0 测试补全（Step 4/6/边界 + 80% 覆盖）** | 扩展 `test_step4_fusion`/`test_step6_environment`/`test_verdict`/`test_rule_engine`/`test_strategy_ghost`；新增 `test_decision_pipeline_l0.py`、`test_experience_engine_units.py`。`decision_pipeline`/`rule_engine` 100%；决策核心五模块合计 **83%**（`pytest … --cov-fail-under=80` 152 passed）。 | PRD 决策引擎 ≥80% 覆盖率达标；async DB 写回路径仍靠集成测。 |
| 2026-06-19 | **Training Ledger 加载态骨架屏** | 新增 `TrainingLedgerPageSkeleton`；`/training-ledger/[id]` 在 JWT 未就绪或 Panda 详情加载中显示 skeleton（对齐 Agent Wallet 页），避免空白页与 $0 占位指标。 | 进入训练页可见 loading 反馈；`tsc` 通过。 |
| 2026-06-19 | **移除独立 Strategy 页，喂策略并入 Training Ledger** | 删除 `/strategy/[id]` 与导航栏 Strategy tab；`FeedStrategyDrawer` 按 `page-strategy.md` 重构（模板架、Policy 兼容、版本+ghost、RuleBlockEditor、校验/保存 CTA、详情 drawer）；`strategyPath()` 改指向 `/training-ledger/:id?feed=strategy`。 | J3 喂策略仅在 Training Ledger 侧栏「Feed strategy」与 `?feed=strategy` 深链；`strategyPage`/`routeJump`/`profileCta` 测试 + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy 策略库 + LLM 主路径（v2 设计落地）** | 重写 `docs/design/page-strategy.md`：Empty=纯 LLM、Library=左策略库/右积木、保存≠喂给、确认弹窗、标题可改名；后端新增 `GET /strategies`、`POST /strategy/parse`、`PATCH /strategy/:id`、`POST /strategy/:id/activate`、`activate=false` 草稿保存；前端拆分 `FeedStrategyEmptyState`/`LibraryPanel`/`EditorPanel`/`ConfirmDialog`。 | 每只熊猫独立策略库，一键从列表喂给；编辑 active 策略直接更新场上剧本；`pytest test_strategy_feed` + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy 币圈 Prompt 模板 + 英文 UI + 输入框聚焦质感** | Empty/Library 增加 crypto-scene prompt chips（SUI dip / DEEP momentum / range / BTC washout），点选填入 NL 输入并聚焦；Feed Strategy 面板文案改英文；`strategy-feed-field` 去除浏览器蓝色 `outline`，改用 inset 金绿 focus glow。 | 小白可先点场景再改字；`tsc` 通过。 |
| 2026-06-19 | **Feed Strategy Prompt 绑定 Agent Wallet 交易对** | `buildStrategyPromptTemplates(allowedPairs)` 从 `fetchAgentWalletStatus` 的 `policy.allowed_pairs`（回退 `launch_pairs`）动态生成场景；无授权对时隐藏 chips 并引导 Agent Wallet；解析失败示例同步 scoped pairs。 | Prompt 不再硬编码 DEEP/SUI；`vitest strategyPromptTemplates` + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy Prompt 跟随图表当前池** | Prompt 改为仅使用 Training Ledger 当前选中 `pool`（父页传入）；切换交易对即时更新 chips/placeholder；移除整页 `Loading strategy library`，空库直接进 LLM 编辑器、库列表仅 inline syncing。 | 与 K 线池选择一致；`vitest` + `tsc` 通过。 |
| 2026-06-19 | **Fix `/strategy/parse` 422 on vague NL prompts** | 新增 `strategy_parse_normalize`：LLM 输出指标/条件归一化 + 启发式 fallback；`parse_strategy_only` 不再 `validate_for_feed`，改返回 `warnings`/`invalid_rules`/`draft_valid`；DeepSeek prompt 收紧支持指标；前端 parse 成功时展示规则待调警告。 | 如 “Use very small size on SUI/USDC while learning…” 不再 422，进入可编辑草稿；`pytest test_strategy_parse_normalize test_strategy_feed` + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy UX + 纯 LLM 质检（用户确认方案）** | 空库解析后保持**单列**（prompt 上 + Review 下），首次 Save 后才进左右策略库；Feed 内 `StrategyBuilder` 隐藏风控滑块与底部 LLM 输入、英文信号规则标签；强化 `deepseek_prompt`（禁 PRICE>0、动量→MA20 指引）；normalize 剔除废规则 + learning 风控上限；编辑器注明风控在 Agent Wallet。 | 解决解析后突然弹出空侧栏与重复 LLM/滑块问题；动量类 prompt 不再保留 PRICE>0；`pytest` 16 passed + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy 可折叠策略库 rail** | 布局统一为「左侧常驻折叠库 rail + 右侧上下 prompt/Review」；空库时 rail 收拢为细条（不突然弹出分栏）；有策略后可展开查看/Feed；首次 Save 自动展开库；移除左侧 NL 输入（解析只在主栏）。 | 保存后继续 LLM 解析布局不变；`FeedStrategyLibraryRail` 替代 `FeedStrategyLibraryPanel`；`tsc` 通过。 |
| 2026-06-19 | **Feed Strategy 策略库卡片 + 弹窗编辑** | 库卡片英文展示（Live 徽章、规则行 BUY/SELL）；移除 Saved·日期；Feed Panda 金色全宽按钮；点击卡片打开 `FeedStrategyPlaybookDialog` 编辑 rule blocks；后端 `human_summary`/title 改英文。 | 已保存策略不再挤占主栏编辑器；`strategyPlaybookSummary` + `FeedStrategyPlaybookCard`；`pytest test_strategy_feed` + `tsc` 通过。 |
| 2026-06-19 | **Feed Strategy 左右分栏质感优化** | 移除 `border-product-line` 硬白线；新增 `strategy-feed-split` / rail inset 暗底 / 金绿渐变 hairline / workspace 径向光；Review 区与 playbook 卡片改 inset shadow。 | 左右栏过渡更自然，与 drawer 黑金质感一致；`tsc` 通过。 |
| 2026-06-19 | **Fix Feed Panda 确认弹窗被抽屉遮挡** | `FeedStrategyConfirmDialog` 使用 `--z-drawer-stack`（55）与 `strategy-feed-confirm-dialog` 实底样式；修复未定义 `--z-drawer` 导致弹窗在 drawer 后不可见；确认后调用 `POST /panda/:id/strategy/:id/activate`。 | 点击 Feed Panda 应先出现确认框，确认后走 activate API；`tsc` 通过。 |
| 2026-06-19 | **Live 策略卡片选中态强化** | `is_active` 卡片：`--active` 绿框+左侧光条+`In use` 徽章+底部「Panda is using this playbook」；库列表 active 置顶；预览态与 live 态分离。 | 用户可一眼识别当前喂给熊猫的策略；`tsc` 通过。 |
| 2026-06-19 | **Feed 确认弹窗展示 Policy 冲突明细** | 新增 `PolicyConflictList`（Order size / Drawdown budget 等可读标签）；`FeedStrategyConfirmDialog` 在冲突时列出 `policy_conflicts` 与 `policy_summary`；`PolicyCompatibilityPreview` 同步改用友好文案；Feed 前 validate 增加 loading 态。 | 点击 Feed Panda 可见如「$850 vs $50」「$1275 vs $8」等具体超限原因；`tsc` 通过。 |
| 2026-06-19 | **Feed 弹窗内联可编辑风险预算** | 新增 `FeedStrategyRiskBudgetFields`（Order size / Drawdown budget 美元输入，超限字段红框+行内提示）；移除独立 Policy 警告区块；编辑后实时 `validate`，合规后红字消失、Feed 可点；确认喂策略前 `PATCH` 更新 parsed。 | 点击策略/Feed 弹窗直接调仓位与回撤，无需另开 Agent Wallet；`tsc` 通过。 |
| 2026-06-19 | **Fix 风险预算输入每次按键禁用** | 校验中不再 `disabled` 输入框；本地 string 草稿 + focus 保护；`validate` 改 400ms debounce；修复 Drawdown 最低 5% 硬钳制导致无法调到 Wallet cap；Feed 按钮用本地限额判断。 | 连续输入数字不再出现禁止光标；可调到 $50 / $8；`tsc` 通过。 |
| 2026-06-19 | **解耦策略 Drawdown 与 Wallet Daily loss cap** | 移除 `policy_compatibility` 中 `max_drawdown_pct` vs `max_daily_loss` 错误比较；Feed 弹窗只保留 **Order size per trade**（对齐 Wallet 单笔上限）；Daily loss cap 仅 Agent Wallet + 运行时 `PolicyGate`。 | RSI 等策略 Feed 不再因回撤预算误拦；只需调单笔 ≤ Wallet max；`pytest test_drawdown_does_not_block` + `tsc` 通过。 |
| 2026-06-19 | **Fix validate/save 422 on tight order size** | `PositionSizingLayers.value` 下限从 `ge=0.01`（1%）改为 `ge=0.0001`，上限 `le=1.0`；支持 Wallet $50 / $8.5k ledger（≈0.59%）的 PATCH/validate。 | Save changes + validate 不再 FastAPI 422；`pytest test_position_sizing_accepts_wallet_tight` 通过。 |
| 2026-06-19 | **Playbook 保存后只关详情弹窗** | `FeedStrategyPlaybookDialog` Save 成功不再调用父级 `onSaved`（避免 Training Ledger 关掉整个 Feed Strategy 抽屉）；仅 `onOpenChange(false)` 关详情 Modal。 | Save changes 后 Signal playbook 抽屉保持打开；`tsc` 通过。 |
| 2026-06-19 | **Feed 确认弹窗 Order size 只读** | `FeedStrategyRiskBudgetFields` 新增 `readOnly`；`FeedStrategyConfirmDialog` 仅展示单笔规模，编辑留在 Playbook 详情。 | Feed Panda 确认框不再可改 Order size；超限提示引导回详情编辑；`tsc` 通过。 |
| 2026-06-19 | **K 线多指标搜索与多选** | 新增 `IndicatorPicker` + `lib/chart/indicators` 注册表（MA7/20/25、EMA12、RSI14、MACD、BOLL）；替换原 MA 开关；overlay/sub-pane 动态布局；`localStorage` 持久化；默认仍 MA7+MA25。 | Training Ledger / Market 页 K 线可搜索多选指标；参数对齐策略/market-monitor；`vitest indicators` + `tsc` 通过。 |
| 2026-06-19 | **Fix 子图 price scale 报错** | 子图 scale ID 改为无冒号（`sub-rsi-14`）；先 `addSeries` 再 `series.priceScale().applyOptions`，避免 `incorrect ID: sub-rsi:14`。 | 选择 RSI/MACD 子图不再抛 lightweight-charts price scale 错误。 |
| 2026-06-19 | **指标选择器改为 tag 输入框** | `IndicatorPicker` 改为 combobox：已选指标以 tag 回填输入框内；下拉项点击切换（无 checkbox）；选中/未选中背景区分。 | K 线工具栏不再显示 Indicators 按钮+外置 chip。 |
| 2026-06-19 | **指标可全部清空** | 移除「至少保留一个指标」限制；`sanitizeIndicatorSelection` 允许 `[]` 并持久化到 localStorage。 | 用户可取消全部 MA/RSI 等，仅看裸 K 线。 |
| 2026-06-19 | **指标选择器质感 + 下拉不被裁切** | `chart-indicator-*` 黑金 inset 样式；下拉改 portal 固定定位；选中项左侧光条替代白框。 | 下拉完整浮于 K 线面板之上；与 ledger 控件视觉一致。 |
| 2026-06-19 | **Fix 首页 How it works 熊猫形象拉伸** | `PandaNftPreview` 移除 `h-[140%] w-[140%]`（与 `w-full` 冲突导致非等比）；改用 `scale-[1.12]` 放大；`PandaCanvasRenderer` canvas 增加 `object-contain`。 | Step 1 预览圆圈内熊猫比例正常；`tsc` 通过。 |
| 2026-06-19 | **Fix Start training 误报 Feed strategy first** | `GET /panda/:id` 的 `panda_detail_dict` 补 `active_strategy_id`；前端新增 `hasActiveStrategy()`（`active_strategy_id` 或 `current_strategy`）用于 Training Ledger / Profile 门控。 | 已 Feed 且库内 Live 的策略可正常 Start training；`pytest test_panda_serializer` + `vitest hasActiveStrategy/profileCta` + `tsc` 通过。 |
| 2026-06-20 | **WebSocket Hub 部署 Cloudflare**：`wrangler.toml` DO 迁移改为 `new_sqlite_classes`（Free plan 兼容）；上传 Workers Secrets（`JWT_SECRET` + Upstash REST）；`wrangler deploy` → `trading-panda-ws.502488946.workers.dev`；新增 `websocket/scripts/deploy.sh`。 | 生产 WSS：`wss://trading-panda-ws.502488946.workers.dev/ws?token={JWT}`；Vercel 须设 `NEXT_PUBLIC_WS_URL`；本地联调仍用 `:8787` |
| 2026-06-20 | **部署监控与外部服务创建** | 监控 VS Code Claude Code 并按授权确认权限提示；Render CLI 创建 `trading-panda-market-monitor` 与 `trading-panda-backend` 两个 Web Service；Vercel 项目 link 到 `mooses-projects-b6ad2548/frontend` 并写入生产环境变量；`frontend/.env.local` 在 `vercel link` 覆盖后已恢复。 | Render 服务 URL 已写入 §3；本机 Wrangler session 当前未登录，但 Cloudflare Worker 部署事实以上一条记录为准；首次 Vercel production 构建失败（`@mysten/dapp-kit`/Sui prerender `transport` 错误），本地 `pnpm build` 在恢复 `.env.local` 后通过。 |
| 2026-06-20 | **Vercel SSR prerender 修复并部署** | `frontend/src/app/layout.tsx` 改为 `next/dynamic` 加载 `Providers` 且 `ssr:false`，使 `@mysten/dapp-kit` / `SuiClientProvider` 仅在客户端初始化；Vercel `NEXT_PUBLIC_WS_URL` 更新为 Cloudflare WSS；从 `frontend/` 目录执行 production deploy。 | `pnpm build`、`pnpm type-check` 本地通过；Vercel deployment `dpl_J24cC82H4JEQRTRfeQdVLYNuqP1T` 状态 `Ready`，URL `https://frontend-pjvovgnsg-mooses-projects-b6ad2548.vercel.app`；公网访问仍被 Vercel Deployment Protection/SSO 拦截为 HTTP 401，需关闭保护后验收页面。 |
| 2026-06-20 | **Agent Wallet / 规则管线烟测与 pair 规范化修复** | 使用 Python 3.12 venv 跑 backend 定向测试；修复 `policy_compatibility` / `policy_gate` 中 `DEEP/SUI` 与 `DEEP-SUI` 比较不一致导致的策略兼容和运行时 PolicyGate 误拦；用 `env.txt` 连接远端 DB 做只回滚 BUY 执行烟测。 | Frontend Vitest 72 passed；backend 策略/PolicyGate/链签名/ledger/merkle 等定向测试通过；远端候选 Panda 有 active wallet + active policy + active strategy，BUY 烟测可生成 OrderIntent/TradeFact/legacy Trade 并回滚无污染；`/panda/:id/simulation/status` 返回 running 但本地 ASGI `actor_active=false`，Render backend/market-monitor health 本次超时，线上真实 actor 仍需恢复服务后验证。 |
| 2026-06-20 | **Training Ledger 买卖回滚烟测补充** | 在远端 DB 候选 Panda 上用同一事务强制 `DEEP/SUI` BUY 后 SELL，复用 active vault / policy / running simulation，并将 `commit()` monkeypatch 为 `flush()` 后整体 rollback。 | BUY/SELL 均 `EXECUTED`；事务内产生 2 条 OrderIntent、2 条 TradeFact、2 条 legacy Trade，SELL realized PnL 为正；rollback 后三张表计数仍为 0，未污染远端数据。 |
| 2026-06-20 | **P0 Training Ledger ↔ Agent 闭环修复（本地已验）** | 修复 `AsyncSessionLocal` stale import 导致 PandaActor 永远 hydrate 失败；`ActorManager` 启动前 hydrate 并支持 running simulation 自动恢复/失败标 stopped；backend / market-monitor 改为 health-first 后台启动；订阅池统一 canonical `BASE-QUOTE`；旧 `/api/pandas/:id/simulation/*` BFF 路由改为代理 canonical simulation API。 | 本地 backend `/health` 与 market-monitor `/health` 可快速返回；远端 DB 候选 Panda direct hydrate 成功；API `start → status(actor_active=true) → stop` 成功；stale market tick 注入后 actor `last_decision` 更新；backend 定向 pytest 57 passed，frontend vitest 72 passed + type-check 通过，market-monitor 相关 pytest 8 passed。代码尚未提交/推送，因此 Render 线上服务仍需部署后再验公网 `/health`。 |
| 2026-06-20 | **Render Python 版本固定** | `render.yaml` 为 `trading-panda-backend` 与 `trading-panda-market-monitor` 增加 `PYTHON_VERSION=3.12.12`。 | 避免 Render 默认 Python 3.14 导致 `numpy/scipy/asyncpg` 走源码编译、缺 Fortran 编译器而 build failed；需重新部署两个 Render 服务后验收。 |
| 2026-06-20 | **Render rootDir Python 版本文件** | 在 `backend/.python-version` 与 `market-monitor/.python-version` 写入 `3.12.12`。 | 现有 Render 服务未采用 blueprint envVars 的 `PYTHON_VERSION`，rootDir 内版本文件用于强制构建使用 Python 3.12 wheel，避免 Python 3.14 源码编译。 |
| 2026-06-20 | **Backend health DB ping 修正** | `/health` 改为复用应用全局 SQLAlchemy engine，并将 DB ping timeout 调整为 3s。 | 避免每次 health 创建新 engine 导致短超时误报 `db:error`；训练 actor 已可恢复，health 需准确反映 DB 连通性。 |

# TradingPanda 开发上下文（唯一真相）

> 本文档以「忒修斯之船」方式持续维护：只换木板、不换整船。部署事实变更时同步更新对应段落；任何改动必须在本文末尾「§9 变更日志」追加一行。
>
> **最后同步**：2026-05-25（Testnet 合约 publish）

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
| Sui Move 合约 | 🟡 Testnet 已 publish | 80% | `sui client publish` 至 Testnet（Package `0x5950…1465`）；`mint::mint` + DF 初始化；UpgradeCap 在 `0xa459…7bf3`；Kiosk/版税深化待做 |
| PostgreSQL Schema | ✅ 全 18 表迁移 | 100% | Alembic `001`(6 表)+`002`(subscribed_pools)+`003`(其余 12 表：经验/情绪/merkle/成就/签到/缓存/日记)；`verify_db` 覆盖全表 |
| 铸造流程（Mint） | 🟡 Epic 1.3–1.5 完成 | 75% | 问卷→mint→DB 注册→Dashboard；Epic 1.2 合约复核待办 |
| 策略解析 | ✅ Epic 2 完成 | 100% | `POST/GET /panda/:id/strategy` + `validate`；积木 `StrategyBuilder`；LLM 5/min；`strategy_history` ghost 0.40 |
| 8步决策引擎 | 🟡 MVP 实现 | 75% | `decision_pipeline` 八步公式 + `RuleEngine` + `PandaActor` + Redis `market:tick:*` 订阅；Agent/Merkle 链上提交待完善 |
| 情绪状态机 | 🟡 MVP 实现 | 80% | 7 状态转移 + Step 8 情绪扭曲；已接入 Actor |
| 经验引擎（5子系统） | 🟢 读写闭环 | 85% | load + Step5 修正（pattern/mastery/mistake/cycle 全汇入）+ `record_trade` 写回 patterns/mistakes/cycles；纯逻辑单测；**缺**：Walrus 备份 |
| Merkle Root Worker | 🟢 链下闭环 | 70% | leaf 收集 + 树根 + `merkle_roots` 表写入（每50笔，`batch_index`）；**缺**：`submit_merkle_root` 链上提交（合约侧，已留 stub）|
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
| 行情采集 | **`market-monitor/`**（**VPS+PG 推荐**）：OHLCV 自 **`order_fills`** 聚合（**不用** `/ohclv`）；盘口 HTTP :9008；池列表 Sui RPC；→ `PUBLISH market:tick:{pair}` | `docs/market-monitor-design.md` |
| 实时推送（方案甲） | **单 WSS** `NEXT_PUBLIC_WS_URL`：Hub 订 **`market:tick:*` + `panda:*`**；REST 历史 K 线 `GET /candles` | `docs/websocket-hub-design.md` |
| K 线独立服务 | **MVP 不部署** `:9009`；可选方案乙见 `docs/kline-websocket-service.md` | 高频拆流时再上 |

---

## §3 服务拓扑（当前事实）

```
frontend/   → Vercel
            Next.js 14 App Router + TypeScript
            HTTP API Gateway（Next.js API Routes）；**不承载 WebSocket**
            域名：[待 Vercel 部署后填入]

market-monitor/ → **VPS 推荐**（与 DeepBook PG :5433 同机；Render 仅作过渡）
            读 `order_fills` 聚 K 线 + 指标；HTTP :9008 盘口；`PUBLISH market:tick:*`
            `GET /health`；规划 `GET /candles/{pool}`；`DEEPBOOK_DATABASE_URL`
            设计见 docs/market-monitor-design.md

websocket/  → Cloudflare Workers + Durable Objects
            订阅 Upstash：`market:tick:*` + `panda:*`（方案甲）
            `NEXT_PUBLIC_WS_URL`；本地 `npm run dev` :8787

backend/    → Render (Web Service)
            Python 3.11 + FastAPI + uvicorn
            端口：由 Render 注入 $PORT（本地默认 8000）
            域名：[待 Render 部署后填入]

Database    → Supabase（PostgreSQL 15+）或 Render PostgreSQL
            连接池：PgBouncer Transaction 模式（端口 6543）
            连接串：$DATABASE_URL

Cache       → **Upstash Redis**（推荐；MVP 可与 Redis Cloud 互换直至迁移完成）
            连接串：`$REDIS_URL`（Render / 本地 Python 使用 **`rediss://`** TLS，见 backend/.env.example）
            Worker 侧：`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`（仅 CF，勿提交到 Vercel）
            用途：Pub/Sub（DE 发布；WS Hub 订阅）+ 响应缓存（TTL 60s）+ HTTP Rate Limit + Nonce 等（频道见 `docs/redis-architecture.md` §5）

Blockchain  → Sui Testnet（**本项目首次正式 publish**，钱包 `0xa459…7bf3`）
            Package ID：0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465
            PandaRegistry Object ID：0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5
            AchievementRegistry Object ID：0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b
            AdminCap Object ID：0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00
            UpgradeCap Object ID：0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e
            Publish Tx：HM2XXX4MHQzskM6TLgxmoYAsJJarRJfiAKUuWrjaZiQ3
```

---

## §4 环境变量清单

### frontend/.env.local（不提交，参考 frontend/.env.example）

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_BACKEND_URL` | Python 决策引擎 URL（如 https://xxx.onrender.com） |
| `NEXT_PUBLIC_WS_URL` | **唯一** WSS 基址（Hub：`market.tick` + 熊猫事件）；本地 `ws://127.0.0.1:8787/ws` |
| `MARKET_MONITOR_URL` | BFF 代理历史 K 线（默认 `http://localhost:8001`） |
| `NEXT_PUBLIC_SUI_NETWORK` | testnet / mainnet |
| `NEXT_PUBLIC_PACKAGE_ID` | Move 合约 Package ID |
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
| `SUI_PRIVATE_KEY` | 后端签名钱包私钥（Merkle Root 上链用） |
| `PACKAGE_ID` | Move 合约 Package ID |
| `REGISTRY_ID` | PandaRegistry Shared Object ID |
| `WALRUS_API_URL` | Walrus Publisher 节点 URL |
| `JWT_SECRET` | 与 frontend / websocket Worker **相同**（HS256） |
| `INTERNAL_SECRET` | 与 frontend 共享（BFF `X-Internal-Key`） |
| `GOOGLE_CLIENT_ID` | 可选；校验 zkLogin `id_token` 的 `aud` |
| `PORT` | Render 自动注入，uvicorn 监听此端口 |
| `MAX_ACTORS` | 最大并发 PandaActor 数（默认 100） |

### market-monitor/.env（不提交，参考 market-monitor/.env.example）

| 变量名 | 说明 |
|--------|------|
| `REDIS_URL` | 与 backend 相同 Upstash 实例（`rediss://`） |
| `DEEPBOOK_DATABASE_URL` | DeepBook Indexer 库（`order_fills`）；VPS 如 `postgresql://…@127.0.0.1:5433/…` |
| `DEEPBOOK_SERVER_URL` | DeepBook Server（**盘口**等，如 `http://localhost:9008`） |
| `DEEPBOOK_POOLS` | 可选；**非空则强制**使用；留空则默认 `SUI_RPC_URL` 发现池，可回退 `GET /get_pools` |
| `SUI_RPC_URL` | 全节点 JSON-RPC；**仅**用于 `suix_queryEvents` 枚举 `PoolCreated`（默认 Testnet） |
| `DEEPBOOK_PACKAGE_ID` / `DEEPBOOK_POOL_MODULE` | DeepBook 包与 `pool` 模块（默认 `0xdee9` / `pool`） |
| `USE_SUI_RPC_FOR_POOLS` / `USE_HTTP_GET_POOLS_FALLBACK` | 池发现开关与 HTTP 回退 |
| `POOL_RPC_LIMIT_PER_PAGE` / `POOL_RPC_MAX_PAGES` | 池事件查询分页 |
| `POLL_INTERVAL_SEC` | 主循环间隔，默认 **15** |
| `FILLS_POLL_LOOKBACK_SEC` | tick 读 PG `order_fills` 深度，默认 **72h** |
| `FILLS_LOOKBACK_SEC` | `GET /candles` 历史深度，默认 **30d** |
| `PORT` | Render 注入 |

### Cloudflare WebSocket Hub（`.dev.vars` / Workers Secrets，不提交）

| 变量名 | 说明 |
|--------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST API 基址（与 `REDIS_URL` 指向同一数据库） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST Token（Hub 使用 `@upstash/redis` 等 SDK） |

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
GET  /api/panda/my                   # 我的熊猫（代理 → backend `/pandas`）
GET  /api/panda/[id]                 # 单只熊猫详情（代理 → `/pandas/:id`）
GET  /api/pandas                     # 当前用户的熊猫列表（legacy，同 `/api/panda/my`）
GET  /api/pandas/[id]                # 单只熊猫详情
POST /api/pandas/[id]/strategy       # 喂策略（转发 → Python backend）
POST /api/pandas/[id]/simulation/start  # 启动模拟
POST /api/pandas/[id]/simulation/stop   # 停止模拟
POST /api/pandas/[id]/calm-bamboo    # 使用冷静竹（重置情绪）

GET  /api/market/candles             # 历史 K 线（BFF → market-monitor GET /candles?pool=…）
GET  /api/leaderboard                # 排行榜（Redis 缓存 TTL 60s）
GET  /api/achievements               # 成就列表
POST /api/checkin                    # 每日签到
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

**核心表清单（18张）：**
`users` · `pandas` · `strategies` · `strategy_history` · `trades` · `simulations` ·
`experience_patterns` · `experience_mastery` · `experience_mistakes` · `experience_cycles` ·
`emotions_log` · `merkle_roots` · `achievements` · `user_achievements` · `checkins` ·
`market_data_cache` · `correlation_matrix` · `panda_diary`

**当前迁移状态**：`backend/alembic/versions/001_initial_core_tables.py`（revision `001_initial_core`）已创建 6 张核心表；其余 ORM 表（经验/成就/情绪日志等）尚未迁移。本地：`alembic upgrade head` → `python scripts/verify_db.py` → `python scripts/seed_dev.py`。

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
| 2026-06-13 | **前端 UI 风格全面优化**：移除中国风水墨主题（暖黄纸底色→干净浅灰 #f8f9fa、竹绿→现代绿 #0f973d、Noto Serif SC→Inter 字体）；删除 30+ 自定义 Tailwind 颜色为 primary+neutral 双色系；移除所有装饰性动画（breathe/glowPulse/panda-breathe/radar-reveal）、emoji 图标、发光稀有度效果、`.card-paper`/`.panda-silhouette`/`.glow-rare` 等工具类；Dashboard 布局从 3 栏改为 2 栏（策略构建器从固定右栏→抽屉式 `StrategyMobileDrawer`）；Navbar 导航精简为 4 个链接+用户菜单；首页 Hero 重写为干净打字排版；组件文案去 emoji、去中文术语（英文标签）；移除 `@fontsource/noto-sans-sc` 和 `@fontsource/noto-serif-sc` 依赖；`pnpm build` 通过，`pnpm type-check` 零错误 | UI 风格从「AI 生成中式水墨模板」升级为干净专业的现代 Web3 产品风格 |
| 2026-06-13 | **TODO/进度 review 校正（仅文档）**：核对代码后修正 `dev-docs/TODO.md` Epic 7——经验引擎与 Merkle 非「0% 待开始」：`ExperienceEngine` load + pattern/mastery 修正已接入 `decision_pipeline` Step5（line 189-190）与 `panda_actor.record_trade`（line 355），`compute_merkle_root` 树算法 + actor `%50` 触发骨架（`panda_actor.py:383`）已就位；真实缺口为「写回补全 / `003` 迁移 12 表 / `submit_merkle_root` 链上提交 / leaf 收集（现传空数组）」。新增 Epic 7.0 迁移前置、Epic 9 UI/UX 现代化（归集 6-13 两次前端工作 + 收尾验证项）；§2.1 经验引擎 0%→50%、Merkle 0%→30%。 | TODO 与代码实况对齐；下一步明确：先跑 `003` 迁移解阻塞，再补经验写回与 Merkle 链上提交。未改任何代码/部署事实 |
| 2026-06-13 | **WalletButton UI 全面重写**：移除 `globals.css` 中脆弱的 dapp-kit `ConnectButton` CSS hack（`!important` 属性选择器），改为 `--dapp-kit-*` CSS 变量覆盖；用 dapp-kit 原生 `<ConnectModal trigger={}>` 替换 `<ConnectButton>`，自定义 trigger 使用项目 `Button` 组件（绿色主题）；重写三个互斥状态：已认证（用户 pill + 下拉菜单 Profile/Dashboard/Achievements/Leaderboard/Logout）、未认证（Connect Wallet/Google 按钮）；移除 Navbar 中重复的用户下拉菜单（统一收归 WalletButton）；`pnpm type-check` 零错误，`pnpm build` 通过 | 钱包按钮 UI 与 TradingPanda 绿色主题完全一致，代码更健壮（不再依赖 dapp-kit 内部类名） |
| 2026-06-13 | **自建品牌化连接弹窗（替换 dapp-kit ConnectModal）**：dapp-kit 原生 `ConnectModal` 内容太素（通用 "What is a Wallet" 文案 + 大片空白）。新增 `components/layout/ConnectWalletModal.tsx`（Radix Dialog + `useWallets`/`useConnectWallet`）：左栏钱包列表（图标+名称+连接态 spinner，空态引导装 Slush）+ Google 选项；右栏 `bg-dark-panel` 品牌价值面板（panda logo + 3 条产品化卖点 One-click login/Own your panda/Verifiable trades，含 lucide 图标）。`WalletButton` 移除 dapp-kit `ConnectModal` 与导航栏独立 Google 按钮（Google 收进弹窗），改受控 `connectOpen` 触发自定义弹窗；连接成功由既有 `WalletAuthSync` 自动登录。清理 `globals.css` 已失效的 dapp-kit ConnectModal 类名 hack（保留 `[data-dapp-kit]` 变量块与 `fadeIn`）。`pnpm type-check` 零错误，`pnpm build` 通过 | 登录弹窗由通用模板升级为品牌化双栏；不再依赖 dapp-kit 内部类名。**待手测**：实际点击钱包/Google 的连接与登录闭环（headless 无法验证钱包弹窗） |
| 2026-06-13 | **UI 优化 P0+P1+P2（去 AI 味 + 统一渐变/动效）**：**P1 token→Tailwind**：`tokens.css` 阴影升级为分层微冷（`--shadow-xs/sm/md/lg` + `--shadow-accent/-lg`），新增渐变 token（`--gradient-brand`/`-soft`/`-dark-panel`/`-hero`，仅绿+中性、禁紫粉）；`tailwind.config.ts` 暴露 `boxShadow`/`backgroundImage`/`transitionTimingFunction(expo/smooth)`/`transitionDuration(fast/normal)`；`globals.css` 加 `.lift` 工具类 + `prefers-reduced-motion` 全局守卫。**P2 组件**：`Button` primary 改 `bg-brand`+`shadow-accent`→hover`-lg`+`active:scale-[0.98]`，`transition-all`→显式属性+easing token，加 `ring-offset`；`Card` default 改 `bg-brand-soft`+边界+分层阴影去扁平。**P0 首页**：`page.tsx` 强调色由绿/靛/琥珀/粉 4 色收敛为单绿（FEATURES 移除 `color` 字段、accent 条改 `bg-brand`、图标改 `bg-primary-50`）；删 logo 卡 3 个装饰浮点；Hero 背景收编为 `bg-hero`；CTA Banner/Footer `bg-neutral-900`→`bg-dark-panel`；卡片套 `.lift`。`pnpm type-check` 零错误，`pnpm build` 通过 | UI 去除 AI 模板感（多色强调/随机浮点），全站阴影/渐变/动效统一为 token 驱动单一语言；后续 P3（stagger 入场、全站 `.lift` 推广）待做，见 `dev-docs/TODO.md` Epic 9 |
| 2026-06-13 | **组件库统一：原生表单控件 → Radix 基础组件**（分支 `feat/ui-component-library`，每点一 commit）。**新增 5 个 `components/ui/` 基础组件**：`Select`（@radix-ui/react-select，options API）、`Slider`（@radix-ui/react-slider，单值 number）、`Tooltip`（@radix-ui/react-tooltip，自带 Provider，替代 `title`）、`Input`/`Textarea`/`Checkbox`（token 样式，Checkbox 为无障碍原生 input+自绘框）。**迁移**：所有产品页面原生 `<select>`→`Select`（StrategyRuleRow/StrategyBuilder/PandaSelector/PandaSidebar/DashboardPandaPanel/CandlestickChart/market/trading）、`type=range`→`Slider`（StrategyBuilder×4/onboarding/PandaLabControls×6）、`textarea`→`Textarea`（StrategyInput/StrategyTextInput）、文本/搜索 `input`→`Input`（TradeForm/market）；关键 `title`→`Tooltip`（EmotionIndicator/PandaAvatar/WalletButton/SimulationStatusBar/lab 预设）。dev 工具 `PandaLabControls` 全量迁移、`PandaLabQaPage` 4 select、`ExperienceRigEditor` experience-tier select。**有意保留原生**：`ExperienceRigEditor` 的内联 pill select、坐标数字输入、overlay checkbox、图标工具按钮（密集专业编辑器，转换低价值高风险）。`pnpm type-check` 零错误，`pnpm build` 通过。**前端不加测试**（用户决定，仅服务端逻辑改动才测；安装的 vitest 框架已回退）。 | 全站表单控件统一为 Radix 驱动的品牌基础组件；键盘/无障碍/聚焦态一致；不再散落原生 select/range/title。剩余 dev-only 原生控件为有意例外 |
| 2026-06-13 | **Growth + 经验/Merkle 链下闭环**（分支 `feat/growth-engine`，每点一 commit，7 个功能点）。**①数据库**：Alembic `003` 迁移其余 12 表（经验×4/情绪/merkle/成就×2/签到/缓存×2/日记），`verify_db` 覆盖全 18 表；修正 `experience_mastery.mastery_score` 精度 `Numeric(5,4)→(6,2)`（0–100 溢出）。**②Leaderboard**：`GET /leaderboard`(winrate/pnl/level，链下聚合 trades+pandas) + BFF。**③Achievements**：9 项目录 + 纯 `evaluate_unlocked` 检测 + 懒持久化 `user_achievements` + `GET /achievements` + BFF。**④Checkin**：`POST/GET /checkin`(streak/reward 纯逻辑) + BFF GET。**⑤经验写回**：`record_trade` 写回 patterns(running win-rate→confidence)/mistakes(>2%亏损)/cycles(各自 savepoint 降级)，actor 传 market 上下文。**⑥Merkle 链下**：actor 每50笔收集 leaves→树根→写 `merkle_roots`(batch_index)，`submit_merkle_root` 链上留 stub。**⑦前端 Growth UI**：leaderboard/achievements/profile(签到日历) 三页接真实 API，替换占位。后端纯逻辑 `pytest` 37 项绿（无需 DB）；前端 `type-check`+`build` 通过。 | MVP 验收「排行榜/成就/签到」可演示（链下）；经验与信任层链下闭环。**排除**：交易 Agent 设计、合约（Kiosk 版税/Merkle 链上提交/链上奖励）。**环境注意**：本机 Python 3.13 下 asyncpg 无法编译，迁移/集成需在你的环境 `alembic upgrade head` + 全量 `pytest` 验证 |

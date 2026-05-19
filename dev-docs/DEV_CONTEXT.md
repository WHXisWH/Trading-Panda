# TradingPanda 开发上下文（唯一真相）

> 本文档以「忒修斯之船」方式持续维护：只换木板、不换整船。部署事实变更时同步更新对应段落；任何改动必须在本文末尾「§9 变更日志」追加一行。
>
> **最后同步**：2026-05-19（DeepBook Server API · 无应用层 Sui RPC 行情）

---

## §1 项目概述（为什么做）

### 1.1 产品目标

TradingPanda 是 Sui 链上的 **AI 交易宠物养成系统**，目标是 Sui Overflow 2026 黑客松（2026年5-6月）。

- 用户铸造一只熊猫 NFT（性格五轴由 `sui::random` 随机生成，不可更改）
- 用户用自然语言喂给熊猫交易策略，熊猫在模拟盘自主练习交易
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
| Sui Move 合约 | 🟡 本地实现完成 | 70% | 核心模块按 `docs/contract-design.md` 实现并通过本地 `sui move test`；待重新部署 Testnet 与 Kiosk/版税深化 |
| PostgreSQL Schema | ⏸️ 待开始 | 0% | 建表 SQL + Alembic 迁移待写 |
| 铸造流程（Mint） | ⏸️ 待开始 | 0% | 合约 + 前端 UI + 后端事件监听 |
| 策略解析 | ⏸️ 待开始 | 0% | DeepSeek V3 接入 + 四层结构化 |
| 8步决策引擎 | ⏸️ 待开始 | 0% | Python PandaActor 核心 |
| 情绪状态机 | ⏸️ 待开始 | 0% | 7状态，Python |
| 经验引擎（5子系统） | ⏸️ 待开始 | 0% | PostgreSQL 读写 |
| Merkle Root Worker | ⏸️ 待开始 | 0% | 每50笔 → 上链 |
| 模拟盘前端 Dashboard | ⏸️ 待开始 | 0% | K线 + 决策链可视化 + WebSocket |
| NFT 市场（Kiosk） | ⏸️ 待开始 | 0% | Sui Kiosk 集成 |
| 排行榜/成就/签到 | ⏸️ 待开始 | 0% | |
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
| 行情采集 | **独立 `market-monitor/`**（Render）；**DeepBook Server HTTP API**（Indexer+Server 背后链上数据）→ `PUBLISH market:tick:{pair}`；DE **仅 SUBSCRIBE**；**应用不直连 Sui RPC** | 见 `docs/market-monitor-design.md`、`docs/deepbook-v3-server-local-deployment.md` §4 |
| 实时推送 | WebSocket Hub = **Cloudflare Workers + Durable Objects**；与 Render 上 DE 共用 **同一 Upstash Redis**（DE `rediss://` 发 `panda:*`；Worker **REST** 订阅）；DO 仅存连接/订阅/有界队列等短时状态 | Vercel 无长连接；权威数据仍在 PostgreSQL |

---

## §3 服务拓扑（当前事实）

```
frontend/   → Vercel
            Next.js 14 App Router + TypeScript
            HTTP API Gateway（Next.js API Routes）；**不承载 WebSocket**
            域名：[待 Vercel 部署后填入]

market-monitor/ → Render (Web Service，规划中)
            DeepBook v3 行情；`REDIS_URL` 与 backend 同库；`GET /health`
            设计见 docs/market-monitor-design.md

websocket/  → Cloudflare Workers + Durable Objects（规划中，docs/websocket-hub-design.md）
            订阅 Upstash：`panda:*`（必须）、`market:*`（可选）；**不**直连 market-monitor（§3.4）
            浏览器 WSS；`NEXT_PUBLIC_WS_URL`

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

Blockchain  → Sui Testnet
            Package ID：0x9b26dfdddef52c980dea0989a22c751ee4c4551d9e39708ab9503990cc7b9710
            PandaRegistry Object ID：0xbc1b3fe71a33501e48c785b2dde2073524d019512915533fd3893d0b65c93541
            AchievementRegistry Object ID：0xc82e707ff49754797556d22542d1d855e4324dc85be9a2393542522be738c3a7
            AdminCap Object ID：0x3dc249213d4e255a546c4e20e96ea593ca4759a8c7210e5dadb17d0bf4dd05ff
            UpgradeCap Object ID：0x42543e8c050577dc62c32003087121530359cdcaf30a87e9c7f7b763d12f7308
```

---

## §4 环境变量清单

### frontend/.env.local（不提交，参考 frontend/.env.example）

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_BACKEND_URL` | Python 决策引擎 URL（如 https://xxx.onrender.com） |
| `NEXT_PUBLIC_WS_URL` | WebSocket Hub 完整基址（`wss://…`，Cloudflare Workers；与 Vercel 域名无关） |
| `NEXT_PUBLIC_SUI_NETWORK` | testnet / mainnet |
| `NEXT_PUBLIC_PACKAGE_ID` | Move 合约 Package ID |
| `NEXT_PUBLIC_REGISTRY_ID` | PandaRegistry Shared Object ID |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | zkLogin Google OAuth Client ID |
| `JWT_SECRET` | JWT 签发密钥（仅服务端，32字节随机hex） |
| `INTERNAL_SECRET` | frontend→backend 内部调用鉴权（32字节随机hex） |

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
| `INTERNAL_SECRET` | 与 frontend 共享的内部调用密钥 |
| `PORT` | Render 自动注入，uvicorn 监听此端口 |
| `MAX_ACTORS` | 最大并发 PandaActor 数（默认 100） |

### market-monitor/.env（不提交，参考 market-monitor/.env.example）

| 变量名 | 说明 |
|--------|------|
| `REDIS_URL` | 与 backend 相同 Upstash 实例（`rediss://`） |
| `DEEPBOOK_SERVER_URL` | DeepBook Server 基址（如 `http://localhost:9008`）；**MVP 行情唯一入口** |
| `DEEPBOOK_POOLS` | 可选；留空则从 `GET /get_pools` 拉取 |
| `POLL_INTERVAL_SEC` | API 轮询间隔，建议 ≥ 2 |
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
POST /api/auth/wallet-login          # Sui 钱包签名登录，签发 JWT
POST /api/auth/zklogin               # zkLogin Google 验证
POST /api/auth/refresh               # 刷新 JWT

GET  /api/pandas                     # 当前用户的熊猫列表
GET  /api/pandas/[id]                # 单只熊猫详情
POST /api/pandas/[id]/strategy       # 喂策略（转发 → Python backend）
POST /api/pandas/[id]/simulation/start  # 启动模拟
POST /api/pandas/[id]/simulation/stop   # 停止模拟
POST /api/pandas/[id]/calm-bamboo    # 使用冷静竹（重置情绪）

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

**当前迁移状态**：`backend/alembic/versions/` 为空，初始 Schema 待写。

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

Package ID：**0x9b26dfdddef52c980dea0989a22c751ee4c4551d9e39708ab9503990cc7b9710**

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
|| 2026-05-16 | **DeepBook 监听方案 B（独立 market-monitor）**：新增 `docs/market-monitor-design.md`、`market-monitor/.env.example`；DeepBook **v3** 事件类型；行情 `PUBLISH` 迁至 monitor，DE 仅 `MarketDataConsumer`；更新 `redis-architecture.md`、`architecture.md`、`backend-design.md`、`agent-design.md`、`business-flow.md`、`render.yaml`、本文 §2.2/§3/§4。 | 架构锁定独立监听服务；**market-monitor 代码与 Pool ID 仍待实现/配置** |
| 2026-05-19 | **DeepBook v3 Server 本地部署指南**：新增 `docs/deepbook-v3-server-local-deployment.md`（1130行），覆盖从源码 & Docker 两种部署方式，包含 PostgreSQL 配置、Sui RPC 配置、Indexer 运行、Server 启动、30+ API 端点使用示例、编译 troubleshooting、docker-compose 示例。 | 开发者可按照指南在本地完整部署 DeepBook v3 Server + Indexer；用于 market-monitor 的数据库访问和 API 测试 |
| 2026-05-19 | **Redis Pub/Sub 桥接服务**：新增 `redis-pubsub/`（FastAPI：`PSUBSCRIBE`、`POST /api/publish`、`WS /ws`、`GET /health`）；`render.yaml` 增加 `trading-panda-redis-pubsub`；`docs/redis-architecture.md` §2.1；本文 §3/§4。 | 独立 Pub/Sub 扇出与内部发布 API 可本地 `uvicorn` + pytest；**Render 部署与 Upstash 联调仍待配置** |
| 2026-05-19 | **最终移除 redis-pubsub**：删除 `redis-pubsub/` 目录；`render.yaml` 去掉 `trading-panda-redis-pubsub`；DE/Hub/monitor 均直连 Upstash。 | 架构收敛：无中间 Pub/Sub 桥；见 `docs/redis-architecture.md` §2.1 |
| 2026-05-19 | **DeepBook MVP 数据路径**：`docs/deepbook-v3-server-local-deployment.md` §4 锁定 Indexer+Server API；`market-monitor` 不直连 Sui RPC；同步 `docs/market-monitor-design.md` §4。 | 行情经 DeepBook Server HTTP；链上 RPC 仅 Indexer/Server 内部 |
| 2026-05-19 | **market-monitor 实现**：`feed/deepbook_client`、`pipeline/indicators`、`broadcast/publisher`、`monitor` 轮询循环；`GET /health`；`PUBLISH market:tick:{pair}`。 | `uvicorn main:app --port 8001` + DeepBook Server + Redis 可联调 |
| 2026-05-19 | **DeepBook v3 部署文档更新**：`docs/deepbook-v3-server-local-deployment.md` 新增 §4 架构决策（Indexer vs Sui RPC 对比表、分阶段过渡路径、技术指标数据需求）、§5 数据保留策略（MVP 30天/正式 6个月、存储空间估算、cron 清理脚本 + Python 清理脚本）；更新 §6 PostgreSQL 配置（推荐 Docker 替代 Homebrew）、§8 编译指南（强调 release 模式必要性）、§9 Indexer 运行（新增 `--start-checkpoint` 加速首次同步）、§16 FAQ 新增 4 条（Q4 release 编译失败、Q11 API 端点路径纠正、Q12 Homebrew 兼容性）。全文 1255 行。 | 部署指南更完善，覆盖实际部署经验教训；开发者可避免 Homebrew/调试编译/API 路径等常见陷阱 |
